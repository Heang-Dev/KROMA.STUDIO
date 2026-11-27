import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export type ToolName = "ffmpeg" | "ffprobe" | "yt-dlp" | "uvx";

const isWindows = process.platform === "win32";

/** Tools shipped inside the app (Windows and Linux builds carry FFmpeg and yt-dlp; see scripts/fetch-tools.mjs). */
export function bundledToolsDir(): string | null {
	const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
	const candidates = [resources && join(resources, "bin"), join(__dirname, "../../vendor/bin")].filter(Boolean) as string[];
	return candidates.find((d) => existsSync(d)) ?? null;
}

/**
 * Each system's usual install places: apps opened from the Finder, Start menu or a desktop launcher don't get the
 * shell's PATH.
 */
function systemDirs(): string[] {
	const home = homedir();
	const common = [join(home, ".local", "bin"), join(home, ".cargo", "bin")];
	if (isWindows) {
		const local = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
		return [...common, join(local, "Microsoft", "WinGet", "Links"), join(home, "scoop", "shims"), "C:\\ProgramData\\chocolatey\\bin", "C:\\ffmpeg\\bin"];
	}
	if (process.platform === "darwin") return ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", ...common];
	return ["/usr/local/bin", "/usr/bin", "/snap/bin", ...common];
}

/** Where to look, in order. On a Mac, Homebrew's tools come first (they have the Mac's video chip encoder); elsewhere the app's own copies. */
function searchDirs(): string[] {
	const bundled = bundledToolsDir();
	const path = (process.env.PATH ?? process.env.Path ?? "").split(delimiter);
	const dirs = process.platform === "darwin" ? [...systemDirs(), ...path, bundled] : [bundled, ...systemDirs(), ...path];
	return dirs.filter((d): d is string => Boolean(d));
}

export function findTool(name: ToolName | "psql"): string | null {
	const file = isWindows ? `${name}.exe` : name;
	for (const dir of searchDirs()) {
		const candidate = join(dir, file);
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

/** How to install a missing tool on this system. */
export function installHint(name: ToolName): string {
	const pkg = name === "ffprobe" ? "ffmpeg" : name === "uvx" ? "uv" : name;
	if (isWindows) return name === "uvx" ? "winget install astral-sh.uv" : `winget install ${pkg === "ffmpeg" ? "Gyan.FFmpeg" : "yt-dlp.yt-dlp"}`;
	if (process.platform === "darwin") return `brew install ${pkg}`;
	return name === "uvx" ? "curl -LsSf https://astral.sh/uv/install.sh | sh" : `sudo apt install ${pkg}`;
}

export function requireTool(name: "ffmpeg" | "ffprobe" | "yt-dlp"): string {
	const found = findTool(name);
	if (!found) throw new Error(`${name} is not installed. Install it with: ${installHint(name)}`);
	return found;
}

/** PATH for the commands Kroma runs, so they find each other (yt-dlp and audio-separator need ffmpeg). */
export function toolPath(): string {
	return [...new Set(searchDirs())].join(delimiter);
}

/** The environment for a command: PATH set once (Windows spells it "Path"; two copies would confuse it). */
function commandEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {};
	for (const [k, v] of Object.entries(process.env)) if (k.toUpperCase() !== "PATH") env[k] = v;
	return { ...env, PATH: toolPath(), ...extra };
}

export interface RunOptions {
	onLine?: (line: string) => void;
	signal?: AbortSignal;
	/** Extra environment variables for the command. */
	env?: Record<string, string>;
}

/** Runs a command, streaming stdout + stderr lines; resolves with stdout, rejects with the stderr tail. */
export function run(command: string, args: string[], options: RunOptions = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { env: commandEnv(options.env), windowsHide: true });
		let stdout = "";
		const tail: string[] = [];
		const onAbort = () => child.kill("SIGTERM");
		options.signal?.addEventListener("abort", onAbort, { once: true });

		const feed = (chunk: Buffer, keep: boolean) => {
			const text = chunk.toString();
			if (keep) stdout += text;
			for (const line of text.split(/[\r\n]+/)) {
				if (!line.trim()) continue;
				options.onLine?.(line);
				if (!keep) {
					tail.push(line);
					if (tail.length > 30) tail.shift();
				}
			}
		};
		child.stdout.on("data", (c: Buffer) => feed(c, true));
		child.stderr.on("data", (c: Buffer) => feed(c, false));
		child.on("error", reject);
		child.on("close", (code) => {
			options.signal?.removeEventListener("abort", onAbort);
			if (options.signal?.aborted) reject(new Error("Cancelled"));
			else if (code === 0) resolve(stdout);
			else reject(new Error(tail.slice(-6).join("\n") || `${command} exited with code ${code}`));
		});
	});
}

/** Runs a command and returns its raw stdout bytes (for decoded audio). */
export function runBuffer(command: string, args: string[], signal?: AbortSignal): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { signal, windowsHide: true });
		const chunks: Buffer[] = [];
		let stderr = "";
		child.stdout.on("data", (c: Buffer) => chunks.push(c));
		child.stderr.on("data", (c: Buffer) => {
			stderr = (stderr + c.toString()).slice(-2000);
		});
		child.on("error", reject);
		child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(stderr.trim().split("\n").slice(-3).join("\n") || `exit ${code}`))));
	});
}

/** Runs async jobs with at most `limit` in flight; results keep the input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i], i);
		}
	});
	await Promise.all(workers);
	return results;
}
