import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, closeSync, createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { app } from "electron";
import type { KvsStatus, Settings } from "@shared/types";
import { kvsStatus } from "./kvs";
import { findTool, run } from "./tools";

// Kroma's own voice engine (engine/ in this repo, shipped in the app's resources): installed once into Kroma's data
// folder with one button, then started and stopped by Kroma. Nothing else is needed: Kroma fetches uv (a small Python
// installer) when the computer has none, uv brings Python 3.11, and the voice model downloads on first use.
//
//   <userData>/voice-engine/venv        Python and the engine's packages (about 2 GB)
//   <userData>/voice-engine/data        the engine's job files
//   <userData>/voice-engine/bin/uv      uv, when Kroma had to fetch it
//   <userData>/voice-engine/installed.json  what was installed (requirements fingerprint), written last

const isWindows = process.platform === "win32";
let child: ChildProcess | null = null;
let installing = false;

const home = () => join(app.getPath("userData"), "voice-engine");
const venv = () => join(home(), "venv");
const dataDir = () => join(home(), "data");
const marker = () => join(home(), "installed.json");
const python = () => join(venv(), isWindows ? "Scripts/python.exe" : "bin/python");

/** The engine's code: in the app's resources once installed, next to the source while developing. */
export function engineDir(): string {
	return app.isPackaged ? join(process.resourcesPath, "engine") : join(app.getAppPath(), "engine");
}

/** The engine's log while Kroma runs it (shown when it fails to start). */
export const engineLog = () => join(home(), "engine.log");
const installLog = () => join(home(), "install.log");

/** True when the engine address is this computer (only then can Kroma install and start it). */
export const isLocalEngine = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/?$/i.test(url.trim());

const requirementsHash = () => createHash("sha1").update(readFileSync(join(engineDir(), "requirements.txt"))).digest("hex").slice(0, 12);

/** "installed": ready; "outdated": installed for an older engine (reinstall to update); "missing": not installed. */
export function installState(): "installed" | "outdated" | "missing" {
	if (!existsSync(python()) || !existsSync(marker())) return "missing";
	try {
		return JSON.parse(readFileSync(marker(), "utf8")).requirements === requirementsHash() ? "installed" : "outdated";
	} catch {
		return "missing";
	}
}

export const isInstalling = () => installing;

/** What's missing to start the engine here, or null when it can start. */
export function cannotStart(settings: Settings): string | null {
	if (!isLocalEngine(settings.kvsUrl)) return "The engine runs on Google Colab (Settings → Voice Engine).";
	if (installing) return "The voice engine is being installed.";
	if (installState() === "missing") return "Install the voice engine first (Settings → Voice Engine).";
	return null;
}

export const engineStartedByKroma = () => child !== null && child.exitCode === null;

// ── Installing ──

/** uv's download for this computer (github.com/astral-sh/uv releases). */
function uvAsset(): string {
	const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
	if (process.platform === "darwin") return `uv-${arch}-apple-darwin.tar.gz`;
	if (isWindows) return `uv-${arch}-pc-windows-msvc.zip`;
	return `uv-${arch}-unknown-linux-gnu.tar.gz`;
}

/** uv: the computer's own (Homebrew, winget, …), else the one Kroma fetched, else fetched now (about 20 MB). */
async function ensureUv(onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<string> {
	// KROMA_FETCH_UV=1 (tests) acts like a computer without uv, so the download path gets exercised.
	const own = process.env.KROMA_FETCH_UV === "1" ? null : findTool("uv");
	if (own) return own;
	const mine = join(home(), "bin", isWindows ? "uv.exe" : "uv");
	if (existsSync(mine)) return mine;
	onProgress(-1, "Getting the Python installer (uv, about 20 MB)");
	const asset = uvAsset();
	const tmp = join(home(), "tmp");
	rmSync(tmp, { recursive: true, force: true });
	mkdirSync(tmp, { recursive: true });
	const archive = join(tmp, asset);
	const res = await fetch(`https://github.com/astral-sh/uv/releases/latest/download/${asset}`, { signal });
	if (!res.ok || !res.body) throw new Error(`Couldn't download the Python installer (${res.status}). Check the internet connection.`);
	await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(archive));
	// tar unpacks both .tar.gz and .zip (bsdtar on macOS and Windows 10+).
	await run("tar", ["-xf", archive, "-C", tmp], { signal });
	const found = findFile(tmp, isWindows ? "uv.exe" : "uv");
	if (!found) throw new Error("The Python installer download was incomplete. Try again.");
	mkdirSync(dirname(mine), { recursive: true });
	renameSync(found, mine);
	if (!isWindows) chmodSync(mine, 0o755);
	rmSync(tmp, { recursive: true, force: true });
	return mine;
}

function findFile(dir: string, name: string): string | null {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isFile() && entry.name === name) return path;
		if (entry.isDirectory()) {
			const found = findFile(path, name);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Installs the engine: uv, Python 3.11 in a private environment, then the engine's packages (about 2 GB, a few
 * minutes). Safe to run again: it updates an older install. The voice model itself downloads on the first start.
 */
export async function installEngine(onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<void> {
	if (installing) throw new Error("The voice engine is already being installed.");
	installing = true;
	stopEngine();
	mkdirSync(home(), { recursive: true });
	const log = createWriteStream(installLog());
	const logLine = (line: string) => log.write(`${line}\n`);
	try {
		const uv = await ensureUv(onProgress, signal);
		onProgress(0.05, "Setting up Python 3.11");
		rmSync(marker(), { force: true });
		await run(uv, ["venv", "--python", "3.11", "--allow-existing", venv()], { signal, onLine: logLine });
		// uv prints one line per package as it lands; about 150 packages for the engine.
		let done = 0;
		onProgress(0.1, "Installing the voice engine (about 2 GB, a few minutes)");
		await run(uv, ["pip", "install", "--python", python(), "-r", join(engineDir(), "requirements.txt")], {
			signal,
			onLine: (line) => {
				logLine(line);
				if (/^\s*(\+|Downloaded|Prepared|Built)\b/.test(line)) done++;
				const name = line.match(/^\s*\+\s*([\w.-]+)/)?.[1] ?? line.match(/Downloaded\s+([\w.-]+)/)?.[1];
				onProgress(Math.min(0.97, 0.1 + done / 320), name ? `Installing the voice engine · ${name}` : "Installing the voice engine (about 2 GB, a few minutes)");
			},
		});
		writeFileSync(marker(), JSON.stringify({ requirements: requirementsHash(), installed: new Date().toISOString(), version: app.getVersion() }, null, "\t"));
		onProgress(1, "The voice engine is installed");
	} catch (err) {
		if (signal?.aborted) throw new Error("Cancelled");
		throw new Error(`${err instanceof Error ? err.message.split("\n").slice(-3).join(" ") : String(err)} (Full log: ${installLog()})`);
	} finally {
		log.end();
		installing = false;
	}
}

/** Removes the installed engine (frees about 2 GB). The voice model in the shared model cache stays. */
export function removeEngine(): void {
	if (installing) throw new Error("Wait for the install to finish.");
	stopEngine();
	rmSync(venv(), { recursive: true, force: true });
	rmSync(marker(), { force: true });
}

// ── Running ──

/** Starts the engine and waits (up to 2 minutes) until it answers. */
export async function startEngine(settings: Settings): Promise<KvsStatus> {
	const already = await kvsStatus(settings);
	if (already.online) return already;
	const reason = cannotStart(settings);
	if (reason) throw new Error(reason);
	if (!engineStartedByKroma()) {
		mkdirSync(dataDir(), { recursive: true });
		const port = settings.kvsUrl.match(/:(\d+)\/?$/)?.[1];
		const log = openSync(engineLog(), "w");
		// Kroma's own ffmpeg first, then Homebrew's (an app opened from Finder has a bare PATH).
		const ffmpeg = findTool("ffmpeg");
		const path = [...(ffmpeg ? [dirname(ffmpeg)] : []), "/opt/homebrew/opt/ffmpeg-full/bin", "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin"].join(isWindows ? ";" : ":");
		child = spawn(python(), ["server.py", ...(port && port !== "7861" ? ["--port", port] : [])], {
			cwd: engineDir(),
			env: { ...process.env, PATH: path, PYTORCH_ENABLE_MPS_FALLBACK: "1", VIRTUAL_ENV: venv(), KVS_OUTPUTS_DIR: join(dataDir(), "outputs"), KVS_VOICES_DIR: join(dataDir(), "voices") },
			stdio: ["ignore", log, log],
			windowsHide: true,
		});
		closeSync(log);
		child.on("exit", () => {
			child = null;
		});
	}
	const until = Date.now() + 120_000;
	while (Date.now() < until) {
		await new Promise((r) => setTimeout(r, 1500));
		if (!engineStartedByKroma()) throw new Error(`The engine stopped while starting. Its log: ${engineLog()}`);
		const status = await kvsStatus(settings);
		if (status.online) return status;
	}
	throw new Error(`The engine didn't answer after 2 minutes. Its log: ${engineLog()}`);
}

/** Stops the engine Kroma started (an engine started another way isn't Kroma's to stop). */
export function stopEngine(): void {
	child?.kill("SIGTERM");
	child = null;
}
