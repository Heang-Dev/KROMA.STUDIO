import { spawn } from "node:child_process";
import { accessSync, constants, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { BrowserWindow, app, shell } from "electron";
import type { UpdateState } from "@shared/types";
import { run } from "./tools";

// Keeps Kroma up to date from its GitHub Releases (Heang-Dev/kroma), like Orca and Trae: it checks on start and every
// few hours, downloads a new version in the background, and a card in the bottom-right corner offers "Restart to update".
// - Windows (installer) and Linux AppImage: electron-updater (latest.yml / latest-linux.yml in each release).
// - macOS: the app isn't signed with an Apple certificate, which Apple's updater requires, so Kroma downloads the new
//   .dmg itself, copies the app out of it, and on restart swaps it into place and opens it.
// - Linux .deb: installing needs the admin password, so Kroma downloads the new .deb and opens it in the installer.

const FEED_REPO = "Heang-Dev/kroma";
const CHECK_EVERY = 4 * 60 * 60 * 1000;

type Method = "auto" | "mac" | "deb";

let state: UpdateState = { status: "idle", current: app.getVersion() };
// Known from the start, so a check from the button works even before the timed checks begin (and in dev builds).
const method: Method = process.platform === "darwin" ? "mac" : process.platform === "linux" && !process.env.APPIMAGE ? "deb" : "auto";
let macStaged: string | null = null;
let debFile: string | null = null;
let autoUpdaterRef: typeof import("electron-updater").autoUpdater | null = null;

function publish(next: Partial<UpdateState>): void {
	state = { ...state, ...next };
	for (const w of BrowserWindow.getAllWindows()) w.webContents.send("update:state", state);
}

export const updateState = (): UpdateState => state;

/** "0.1.10" > "0.1.9"; pre-release suffixes are ignored. */
export function isNewer(latest: string, current: string): boolean {
	const parts = (v: string) => v.replace(/^v/, "").split("-")[0].split(".").map((n) => Number.parseInt(n, 10) || 0);
	const a = parts(latest);
	const b = parts(current);
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
	}
	return false;
}

/** Starts the checks. `enabled` follows Settings → About → "Update automatically". */
export function startUpdater(downloadAutomatically: () => boolean): void {
	const testRun = process.env.KROMA_SMOKE === "1" || process.env.KROMA_E2E === "1";
	if ((!app.isPackaged || testRun) && process.env.KROMA_UPDATE_TEST !== "1") return;
	const check = () => void checkForUpdates(downloadAutomatically()).catch(() => undefined);
	setTimeout(check, 8000);
	setInterval(check, CHECK_EVERY);
}

/** Looks for a newer release; downloads it when `download` (automatic updates) is on. */
export async function checkForUpdates(download = true): Promise<UpdateState> {
	if (state.status === "downloading" || state.status === "ready") return state;
	publish({ status: "checking", error: undefined });
	try {
		if (method === "auto") await checkWithElectronUpdater(download);
		else await checkWithGitHub(download);
	} catch (err) {
		publish({ status: "error", error: friendly(err) });
	}
	return state;
}

/** Downloads the update now (when automatic downloads are off). */
export async function downloadUpdate(): Promise<void> {
	if (state.status !== "available") return;
	if (method === "auto") await autoUpdaterRef?.downloadUpdate();
	else await checkWithGitHub(true);
}

// ── Windows installer and AppImage: electron-updater ──

async function checkWithElectronUpdater(download: boolean): Promise<void> {
	if (!autoUpdaterRef) {
		// electron-updater is a CommonJS package: loaded from the bundled main process it can arrive as `default`.
		const mod = (await import("electron-updater")) as typeof import("electron-updater") & { default?: typeof import("electron-updater") };
		const autoUpdater = mod.autoUpdater ?? mod.default?.autoUpdater;
		if (!autoUpdater) throw new Error("The updater couldn't start.");
		autoUpdaterRef = autoUpdater;
		autoUpdater.autoInstallOnAppQuit = true;
		autoUpdater.logger = null;
		autoUpdater.on("update-available", (info) => publish({ status: "available", version: info.version, notes: notesOf(info.releaseNotes) }));
		autoUpdater.on("update-not-available", () => publish({ status: "none" }));
		autoUpdater.on("download-progress", (p) =>
			publish({ status: "downloading", progress: p.percent / 100, speed: p.bytesPerSecond, secondsLeft: p.bytesPerSecond > 0 ? (p.total - p.transferred) / p.bytesPerSecond : undefined }),
		);
		autoUpdater.on("update-downloaded", (info) => publish({ status: "ready", version: info.version, progress: 1, speed: undefined, secondsLeft: undefined }));
		autoUpdater.on("error", (err) => publish({ status: "error", error: friendly(err) }));
	}
	autoUpdaterRef.autoDownload = download;
	const result = await autoUpdaterRef.checkForUpdates();
	// electron-updater skips the check without any event outside an installed app; don't stay on "checking".
	if (!result && state.status === "checking") publish({ status: "none" });
}

function notesOf(notes: unknown): string | undefined {
	if (typeof notes === "string") return notes.replace(/<[^>]+>/g, "").trim();
	if (Array.isArray(notes)) return notes.map((n: { note?: string }) => n.note ?? "").join("\n").replace(/<[^>]+>/g, "").trim();
	return undefined;
}

// ── macOS and .deb: Kroma's own download from the latest GitHub release ──

interface GitHubRelease {
	tag_name: string;
	body: string | null;
	html_url: string;
	assets: { name: string; browser_download_url: string; size: number }[];
}

async function checkWithGitHub(download: boolean): Promise<void> {
	const res = await fetch(`https://api.github.com/repos/${FEED_REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20_000) });
	if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
	const release = (await res.json()) as GitHubRelease;
	const version = release.tag_name.replace(/^v/, "");
	if (!isNewer(version, app.getVersion())) return publish({ status: "none" });

	const wanted = method === "mac" ? new RegExp(`${process.arch === "arm64" ? "arm64" : "x64"}\\.dmg$`, "i") : /amd64\.deb$|\.deb$/i;
	const asset = release.assets.find((a) => wanted.test(a.name)) ?? (method === "mac" ? release.assets.find((a) => /\.dmg$/i.test(a.name)) : undefined);
	publish({ status: "available", version, notes: release.body ?? undefined, url: release.html_url });
	if (!asset || !download) return;

	const dir = join(app.getPath("userData"), "updates");
	const file = join(dir, asset.name);
	// Keep a half-finished download of this same file (it resumes); everything else in the folder is from before.
	mkdirSync(dir, { recursive: true });
	for (const name of readdirSync(dir)) if (name !== `${asset.name}.part`) rmSync(join(dir, name), { recursive: true, force: true });
	await downloadFile(asset.browser_download_url, file, asset.size, (progress, speed, secondsLeft) => publish({ status: "downloading", progress, speed, secondsLeft }));
	publish({ speed: undefined, secondsLeft: undefined });

	if (method === "deb") {
		debFile = file;
		return publish({ status: "ready", progress: 1 });
	}
	// Copy the app out of the .dmg now, so the restart only has to swap it in.
	publish({ status: "downloading", progress: 1 });
	const mount = join(dir, "mount");
	mkdirSync(mount, { recursive: true });
	await run("/usr/bin/hdiutil", ["attach", file, "-nobrowse", "-readonly", "-mountpoint", mount]);
	try {
		const staged = join(dir, "Kroma Studio.app");
		await run("/usr/bin/ditto", [join(mount, "Kroma Studio.app"), staged]);
		await run("/usr/bin/xattr", ["-cr", staged]).catch(() => "");
		macStaged = staged;
	} finally {
		await run("/usr/bin/hdiutil", ["detach", mount, "-force"]).catch(() => "");
		rmSync(file, { force: true });
	}
	publish({ status: "ready", progress: 1 });
}

/** Smoothed download speed: each new reading moves the average a quarter of the way, so the time left doesn't jump. */
export function smoothSpeed(previous: number | undefined, sample: number): number {
	return previous === undefined ? sample : previous * 0.75 + sample * 0.25;
}

const RETRIES = 6;

/**
 * Downloads `url` to `to` through `<to>.part`. A connection that drops is picked up where it stopped (an HTTP Range
 * request), up to 6 times with a growing wait; a `.part` left by an earlier run (Kroma quit mid-download) resumes too.
 * `onProgress(fraction 0–0.99, bytes a second, seconds left)` about twice a second.
 */
export async function downloadFile(
	url: string,
	to: string,
	size: number,
	onProgress: (progress: number | undefined, speed: number | undefined, secondsLeft: number | undefined) => void,
	wait: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<void> {
	const part = `${to}.part`;
	let speed: number | undefined;
	for (let attempt = 0; ; attempt++) {
		let have = existsSync(part) ? statSync(part).size : 0;
		if (size && have > size) {
			rmSync(part, { force: true });
			have = 0;
		}
		if (!size || have < size) {
			try {
				const res = await fetch(url, { headers: have ? { Range: `bytes=${have}-` } : {} });
				// 416: the server has nothing past what we have (it's complete); 200 to a Range request: start over.
				if (res.status !== 416) {
					if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
					if (have && res.status !== 206) have = 0;
					let done = have;
					let mark = { at: Date.now(), bytes: have };
					const body = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
					body.on("data", (chunk: Buffer) => {
						done += chunk.length;
						const now = Date.now();
						if (now - mark.at >= 500) {
							speed = smoothSpeed(speed, ((done - mark.bytes) * 1000) / (now - mark.at));
							mark = { at: now, bytes: done };
							onProgress(size ? Math.min(0.99, done / size) : undefined, speed, size && speed ? (size - done) / speed : undefined);
						}
					});
					await pipeline(body, createWriteStream(part, { flags: have ? "a" : "w" }));
				}
			} catch (err) {
				if (attempt >= RETRIES) throw err;
				onProgress(size ? Math.min(0.99, (existsSync(part) ? statSync(part).size : 0) / size) : undefined, undefined, undefined);
				await wait(Math.min(30_000, 2000 * 2 ** attempt));
				continue;
			}
		}
		const got = existsSync(part) ? statSync(part).size : 0;
		if (size && got !== size) {
			// Shorter than GitHub says: the connection ended early, so carry on from there.
			if (got < size && attempt < RETRIES) continue;
			rmSync(part, { force: true });
			throw new Error(`The download was incomplete (${got} of ${size} bytes). It will try again.`);
		}
		renameSync(part, to);
		return;
	}
}

// ── Installing ──

/** Restarts into the new version (or opens the downloaded .deb). */
export async function installUpdate(): Promise<void> {
	if (state.status !== "ready") return;
	if (method === "auto") {
		autoUpdaterRef?.quitAndInstall(false, true);
		return;
	}
	if (method === "deb") {
		if (debFile) await shell.openPath(debFile);
		return;
	}
	if (!macStaged || !existsSync(macStaged)) throw new Error("The downloaded update is missing. Check for updates again.");
	// The running app: …/Kroma Studio.app/Contents/MacOS/Kroma Studio
	const target = resolve(app.getPath("exe"), "../../..");
	if (!target.endsWith(".app")) throw new Error("Kroma isn't running from an installed app.");
	try {
		accessSync(dirname(target), constants.W_OK);
	} catch {
		// Not allowed to replace it in place (e.g. run from the disk image): show the new app instead.
		shell.showItemInFolder(macStaged);
		throw new Error(`Kroma can't replace itself in ${dirname(target)}. Drag the new Kroma Studio from the window that opened into Applications.`);
	}
	// After Kroma quits: swap the new app in (keeping the old one until the copy succeeds), then open it.
	const script = join(app.getPath("userData"), "updates", "install.sh");
	writeFileSync(
		script,
		`#!/bin/bash
while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done
OLD="$TARGET.old-$$"
if mv "$TARGET" "$OLD" && /usr/bin/ditto "$STAGED" "$TARGET"; then
  /usr/bin/xattr -cr "$TARGET" 2>/dev/null
  rm -rf "$OLD" "$STAGED"
  # Tell Finder and the Dock the app changed, so they show the new version's icon rather than a cached one.
  /usr/bin/touch "$TARGET"
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$TARGET" 2>/dev/null
else
  rm -rf "$TARGET"; mv "$OLD" "$TARGET"
fi
/usr/bin/open "$TARGET"
`,
	);
	spawn("/bin/bash", [script], { detached: true, stdio: "ignore", env: { ...process.env, TARGET: target, STAGED: macStaged } }).unref();
	app.quit();
}

function friendly(err: unknown): string {
	const msg = err instanceof Error ? err.message : String(err);
	if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed|network|TimeoutError|aborted/i.test(msg)) return "Couldn't reach GitHub to check for updates.";
	if (/404/.test(msg)) return "No releases found yet.";
	return msg.split("\n")[0].slice(0, 200);
}
