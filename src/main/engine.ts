import { type ChildProcess, spawn } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { KvsStatus, Settings } from "@shared/types";
import { kvsStatus } from "./kvs";

// Starts the Khmer Voice Studio engine on this computer from Kroma (Settings → Voice Engine → Start), so nobody needs
// a terminal: the same as `make engine` in the KVS folder (engine/.venv/bin/python server.py). An engine Kroma started
// stops when Kroma quits; one started some other way (a terminal, Colab) is left alone.

let child: ChildProcess | null = null;

/** The engine's log while Kroma runs it (shown when it fails to start). */
export const engineLog = () => join(app.getPath("userData"), "engine.log");

/** True when the engine address is this computer (only then can Kroma start it). */
export const isLocalEngine = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/?$/i.test(url.trim());

/** What's missing to start the engine here, or null when it can start. */
export function cannotStart(settings: Settings): string | null {
	if (!isLocalEngine(settings.kvsUrl)) return "The engine address isn't this computer (it's set to Colab or another machine).";
	if (!settings.kvsProjectDir) return "Choose your Khmer Voice Studio folder first.";
	if (!existsSync(join(settings.kvsProjectDir, "engine", "server.py"))) return "That folder has no engine (engine/server.py). Choose the Khmer Voice Studio folder.";
	if (!existsSync(join(settings.kvsProjectDir, "engine", ".venv", "bin", "python")))
		return "The engine isn't installed yet. In a terminal, in your Khmer Voice Studio folder, run  make engine-setup  once (a few minutes).";
	return null;
}

export const engineStartedByKroma = () => child !== null && child.exitCode === null;

/** Starts the engine and waits (up to 2 minutes) until it answers. */
export async function startEngine(settings: Settings): Promise<KvsStatus> {
	const already = await kvsStatus(settings);
	if (already.online) return already;
	const reason = cannotStart(settings);
	if (reason) throw new Error(reason);
	if (!engineStartedByKroma()) {
		const dir = join(settings.kvsProjectDir, "engine");
		const port = settings.kvsUrl.match(/:(\d+)\/?$/)?.[1];
		const log = openSync(engineLog(), "w");
		// Opened from Finder, Kroma has a bare PATH: add Homebrew's, where ffmpeg (and ffmpeg-full, with libass) live.
		const path = ["/opt/homebrew/opt/ffmpeg-full/bin", "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin"].join(":");
		child = spawn(join(dir, ".venv", "bin", "python"), ["server.py", ...(port && port !== "7861" ? ["--port", port] : [])], {
			cwd: dir,
			env: { ...process.env, PATH: path, PYTORCH_ENABLE_MPS_FALLBACK: "1", VIRTUAL_ENV: join(dir, ".venv") },
			stdio: ["ignore", log, log],
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
