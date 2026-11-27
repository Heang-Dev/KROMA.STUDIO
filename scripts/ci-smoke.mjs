// The Windows / Linux check in CI: starts the packaged app, checks it finds its bundled FFmpeg and yt-dlp, loads a
// test video with Khmer subtitles, exports it, checks the file, and saves screenshots.
// Usage: node scripts/ci-smoke.mjs <path to the packaged app's executable> <output dir>
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { _electron as electron } from "playwright";

const [exe, outDir] = process.argv.slice(2);
if (!exe || !outDir) throw new Error("usage: node scripts/ci-smoke.mjs <app executable> <out dir>");
mkdirSync(outDir, { recursive: true });
const fail = (msg) => {
	console.error(`✗ ${msg}`);
	process.exit(1);
};

// Linux CI runners don't allow Chromium's sandbox for unprivileged users.
const app = await electron.launch({ executablePath: exe, args: process.platform === "linux" ? ["--no-sandbox"] : [], env: { ...process.env, KROMA_SMOKE: "1" } });
const page = await app.firstWindow();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.waitForFunction(() => window.__kroma, null, { timeout: 30000 });
const shot = async (name) => writeFileSync(join(outDir, name), Buffer.from(await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString("base64")), "base64"));

const info = await page.evaluate(() => window.kroma.info());
console.log("platform:", info.platform, "· tools:", JSON.stringify(info.tools));
if (!info.tools.ffmpeg || !info.tools.ffprobe || !info.tools.ytdlp) fail("the bundled FFmpeg / yt-dlp weren't found");

// A 6-second test video, made with the app's own FFmpeg.
const resources = await app.evaluate(() => process.resourcesPath);
const ext = process.platform === "win32" ? ".exe" : "";
const ffmpeg = join(resources, "bin", `ffmpeg${ext}`);
const video = join(outDir, "test-video.mp4");
execFileSync(ffmpeg, ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30", "-f", "lavfi", "-i", "sine=frequency=440", "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", video]);
console.log("yt-dlp", execFileSync(join(resources, "bin", `yt-dlp${ext}`), ["--version"]).toString().trim());

await page.keyboard.press("Escape");
await page.evaluate(async (path) => {
	const { useEditor, actions } = window.__kroma;
	useEditor.getState().closeSettings();
	const media = await window.kroma.probe(path);
	actions.addMedia([media]);
	await window.kroma.visuals(media.path, media.duration);
	useEditor.getState().update((p) => ({
		...p,
		name: "CI test",
		cues: [
			{ id: "a", start: 0.5, end: 2.8, source: "你好，欢迎来到我们的频道。", text: "សួស្តី សូមស្វាគមន៍មកកាន់ឆានែលរបស់យើង។" },
			{ id: "b", start: 3, end: 5.5, source: "我们走吧！", text: "តោះ ទៅ!" },
		],
	}));
	useEditor.getState().seek(1.2);
}, video);
await page.waitForTimeout(2500);
await shot("editor.png");

const out = await page.evaluate(() => window.__kroma.actions.exportVideo("small", true));
if (!out || !existsSync(out)) fail(`export failed: ${await page.evaluate(() => JSON.stringify(Object.values(window.__kroma.useEditor.getState().tasks).map((t) => t.error).filter(Boolean)))}`);
const probe = execFileSync(join(resources, "bin", `ffprobe${ext}`), ["-v", "error", "-show_entries", "format=duration:stream=codec_name", "-of", "csv=p=0", out]).toString().trim().split(/\s+/);
console.log(`export: ${(statSync(out).size / 1e3).toFixed(0)} KB · ${probe.join(" ")}`);
if (!probe.includes("h264") || !probe.includes("aac")) fail("the export isn't H.264 + AAC");

await page.evaluate(() => {
	window.__kroma.applyAppearance("light");
	window.__kroma.useEditor.getState().openSettings("about");
});
await page.waitForTimeout(800);
await shot("settings-light.png");
if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
await app.close();
console.log("✓ smoke test passed");
