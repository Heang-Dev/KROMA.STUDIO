import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

// Apps opened from Finder don't get the shell's PATH, so look in the usual install places too.
const EXTRA_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];

export function findTool(name: "ffmpeg" | "ffprobe" | "yt-dlp"): string | null {
	const dirs = [...(process.env.PATH ?? "").split(delimiter), ...EXTRA_DIRS];
	for (const dir of dirs) {
		const candidate = join(dir, name);
		if (dir && existsSync(candidate)) return candidate;
	}
	return null;
}

export function requireTool(name: "ffmpeg" | "ffprobe" | "yt-dlp"): string {
	const found = findTool(name);
	if (!found) throw new Error(`${name} is not installed. Install it with: brew install ${name === "ffprobe" ? "ffmpeg" : name}`);
	return found;
}

export interface RunOptions {
	onLine?: (line: string) => void;
	signal?: AbortSignal;
}

/** Runs a command, streaming stdout + stderr lines; resolves with stdout, rejects with the stderr tail. */
export function run(command: string, args: string[], options: RunOptions = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { env: { ...process.env, PATH: [process.env.PATH, ...EXTRA_DIRS].join(delimiter) } });
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
		const child = spawn(command, args, { signal });
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
