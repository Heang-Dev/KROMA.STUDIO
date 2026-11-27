// Downloads FFmpeg (with ffprobe) and yt-dlp for the system being built, into vendor/bin, which the Windows and
// Linux builds ship inside the app (Settings → About shows them). A Mac uses Homebrew's FFmpeg instead (it has the
// Mac's video chip encoder), so nothing is fetched there unless asked: node scripts/fetch-tools.mjs --platform=darwin
// Sources: FFmpeg from BtbN's GPL "shared" builds (libx264 included; ffmpeg and ffprobe share one set of libraries,
// half the size of two static programs), yt-dlp from its official releases.
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, realpathSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const platform = process.argv.find((a) => a.startsWith("--platform="))?.split("=")[1] ?? process.platform;
const out = join(import.meta.dirname, "..", "vendor", "bin");
const libOut = join(import.meta.dirname, "..", "vendor", "lib");
const FFMPEG = {
	win32: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip",
	linux: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl-shared.tar.xz",
};
const YTDLP = {
	win32: ["https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe", "yt-dlp.exe"],
	linux: ["https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux", "yt-dlp"],
	darwin: ["https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos", "yt-dlp"],
};

async function download(url, to) {
	process.stdout.write(`↓ ${url}\n`);
	const res = await fetch(url, { redirect: "follow" });
	if (!res.ok) throw new Error(`${res.status} for ${url}`);
	writeFileSync(to, Buffer.from(await res.arrayBuffer()));
	return to;
}

/** The first file with this name anywhere under dir. */
function find(dir, name) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			const hit = find(path, name);
			if (hit) return hit;
		} else if (entry === name) return path;
	}
	return null;
}

if (!YTDLP[platform]) throw new Error(`No tools for ${platform}`);
rmSync(out, { recursive: true, force: true });
rmSync(libOut, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

if (FFMPEG[platform]) {
	const work = join(tmpdir(), `kroma-ffmpeg-${Date.now()}`);
	mkdirSync(work, { recursive: true });
	const archive = await download(FFMPEG[platform], join(work, FFMPEG[platform].split("/").pop()));
	// tar reads zip too (bsdtar on Windows 10+ and macOS).
	execFileSync("tar", ["-xf", archive, "-C", work], { stdio: "inherit" });
	const exe = platform === "win32" ? ".exe" : "";
	const ffmpegExe = find(work, `ffmpeg${exe}`);
	if (!ffmpegExe) throw new Error("ffmpeg not found in the FFmpeg archive");
	const bin = dirname(ffmpegExe);
	for (const tool of ["ffmpeg", "ffprobe"]) cpSync(join(bin, tool + exe), join(out, tool + exe));
	// The shared libraries: next to the programs on Windows (DLLs), in ../lib on Linux (the programs look in $ORIGIN/../lib).
	if (platform === "win32") for (const f of readdirSync(bin).filter((f) => f.endsWith(".dll"))) cpSync(join(bin, f), join(out, f));
	else {
		mkdirSync(libOut, { recursive: true });
		const lib = join(bin, "..", "lib");
		// Only the names the programs load ("libavcodec.so.62"), each copied once (the others are symlinks to them).
		for (const f of readdirSync(lib).filter((f) => /\.so\.\d+$/.test(f))) copyFileSync(realpathSync(join(lib, f)), join(libOut, f));
	}
	rmSync(work, { recursive: true, force: true });
}

const [url, name] = YTDLP[platform];
await download(url, join(out, name));
if (platform !== "win32") for (const f of readdirSync(out)) chmodSync(join(out, f), 0o755);

const size = (dir) => (existsSync(dir) ? readdirSync(dir).reduce((n, f) => n + statSync(join(dir, f)).size, 0) : 0);
console.log(`✓ vendor/bin: ${readdirSync(out).length} files, ${((size(out) + size(libOut)) / 1e6).toFixed(0)} MB with libraries`);
if (!existsSync(join(out, platform === "win32" ? "yt-dlp.exe" : "yt-dlp"))) process.exit(1);
