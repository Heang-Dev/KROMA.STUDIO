// End-to-end smoke test: launches the built app, loads a video with Khmer subtitles,
// screenshots the editor, downloads a short test video from a link, and exports an MP4.
// Usage: bun run build && node scripts/smoke.mjs <test-video.mp4> <output-dir> [--download]
// (PATH is stripped like a Finder launch, so it also checks that ffmpeg and yt-dlp are found.)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { _electron as electron } from "playwright";

const [video, outDir] = process.argv.slice(2);
const withDownload = process.argv.includes("--download");
if (!video || !outDir) throw new Error("usage: node scripts/smoke.mjs <video> <out-dir> [--download]");
mkdirSync(outDir, { recursive: true });

// KROMA_APP=path/to/Kroma Studio.app/Contents/MacOS/Kroma Studio tests the packaged app instead of the dev build.
const app = await electron.launch({
	...(process.env.KROMA_APP ? { executablePath: process.env.KROMA_APP, args: [] } : { args: ["."] }),
	env: { ...process.env, KROMA_SMOKE: "1", PATH: "/usr/bin:/bin" },
});
const page = await app.firstWindow();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.waitForFunction(() => window.__kroma, null, { timeout: 15000 });
await page.keyboard.press("Escape");
await page.evaluate(() => document.querySelector('[role="dialog"]') && document.querySelector('[aria-label="Close"]')?.click());

// Load the video and some Khmer lines.
await page.evaluate(async (path) => {
	const { useEditor, actions } = window.__kroma;
	const media = await window.kroma.probe(path);
	actions.addMedia([media]);
	const lines = [
		["你好，欢迎来到我们的频道。", "សួស្តី សូមស្វាគមន៍មកកាន់ឆានែលរបស់យើង។"],
		["今天我们要讲一个很长的故事，关于一位勇敢的王子和他的王国。", "ថ្ងៃនេះ យើងនឹងនិទានរឿងមួយដ៏វែង អំពីព្រះអង្គម្ចាស់ដ៏ក្លាហានមួយអង្គ និងនគររបស់ព្រះអង្គ។"],
		["我们走吧！", "តោះ ទៅ!"],
	];
	useEditor.getState().update((p) => ({
		...p,
		cues: lines.map(([source, text], i) => ({ id: `c${i}`, start: i * 4 + 0.5, end: i * 4 + 3.5, source, text })),
	}));
	useEditor.getState().seek(5);
}, video);
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, "editor-16x9.png") });

await page.evaluate(() => {
	const { useEditor } = window.__kroma;
	useEditor.getState().update((p) => ({ ...p, aspect: "9:16", style: { ...p.style, showSource: true } }));
	useEditor.getState().setPanel("style");
});
await page.waitForTimeout(800);
await page.screenshot({ path: join(outDir, "editor-9x16.png") });

// Light theme, Khmer panel.
await page.evaluate(() => {
	window.__kroma.applyAppearance("light");
	window.__kroma.useEditor.getState().setPanel("ai");
});
await page.waitForTimeout(600);
await page.screenshot({ path: join(outDir, "editor-light.png") });
await page.evaluate(() => {
	window.__kroma.applyAppearance("dark");
	window.__kroma.useEditor.getState().setPanel("voice");
});
await page.waitForTimeout(600);
await page.screenshot({ path: join(outDir, "editor-voice.png") });
await page.getByRole("button", { name: "Settings" }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: join(outDir, "settings.png") });
await page.getByRole("button", { name: "Appearance" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(outDir, "settings-appearance.png") });
// Interface size: 80% then back to the default.
const zoom = await page.evaluate(async () => {
	const before = window.innerWidth;
	await window.kroma.setZoom(0.8);
	await new Promise((r) => setTimeout(r, 300));
	const after = window.innerWidth;
	await window.kroma.setZoom(0.9);
	return { before, after, setting: (await window.kroma.getSettings()).uiZoom };
});
console.log("zoom", zoom);
// Electron's own capture (the test tool's screenshot mis-sizes a zoomed page).
const png = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString("base64"));
writeFileSync(join(outDir, "native-settings.png"), Buffer.from(png, "base64"));
await page.getByRole("button", { name: "Back to app" }).click();
await page.waitForTimeout(500);
const png2 = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString("base64"));
writeFileSync(join(outDir, "native-editor.png"), Buffer.from(png2, "base64"));

// Drag the tools panel's divider: 120px narrower, then screenshot the narrowest panels.
const handle = page.getByRole("separator", { name: "Resize the tools panel" });
const box = await handle.boundingBox();
const widthBefore = await page.evaluate(() => document.querySelector('[role="separator"]').parentElement.getBoundingClientRect().width);
await page.mouse.move(box.x + box.width / 2, box.y + 200);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 - 150, box.y + 200, { steps: 8 });
await page.mouse.up();
const widthAfter = await page.evaluate(() => document.querySelector('[role="separator"]').parentElement.getBoundingClientRect().width);
console.log("resize", { widthBefore, widthAfter });
await page.evaluate(() => window.__kroma.useEditor.getState().setPanel("post"));
await page.waitForTimeout(300);
const narrowPost = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString("base64"));
writeFileSync(join(outDir, "narrow-post.png"), Buffer.from(narrowPost, "base64"));
await handle.dblclick();

// Khmer voice-over for the three lines.
const voiced = await page.evaluate(async () => {
	const { actions, useEditor } = window.__kroma;
	await actions.makeVoiceOver();
	const v = useEditor.getState().project.voice;
	const task = Object.values(useEditor.getState().tasks).find((t) => t.id.startsWith("voice"));
	return { enabled: v?.enabled, lines: Object.keys(v?.lines ?? {}).length, cues: actions.voiceCues(useEditor.getState().project).length, message: task?.message, toast: useEditor.getState().toast?.text };
});
console.log("voice-over", voiced);

// Export (same steps as the Export button, minus the save dialog).
const exported = await page.evaluate(async (out) => {
	const { useEditor, render, actions } = window.__kroma;
	const { project } = useEditor.getState();
	const frame = project.aspect === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
	await render.ensureFonts();
	const band = render.subtitleBand(project.style, frame);
	const overlays = [];
	for (const cue of project.cues) overlays.push({ start: cue.start, end: cue.end, png: await render.renderBandPng(cue, project.style, frame, band) });
	const media = project.media[0];
	const t0 = performance.now();
	const path = await window.kroma.exportVideo("smoke-export", {
		outPath: out,
		...frame,
		fit: project.fit,
		clips: project.clips.map((c) => ({ path: media.path, in: c.in, out: c.out, hasAudio: media.hasAudio })),
		overlays,
		bandTop: band.top,
		bandHeight: band.height,
		quality: "fast",
		voice: { lines: actions.voiceCues(project), originalVolume: 0.15 },
	});
	return { path, ms: Math.round(performance.now() - t0) };
}, join(outDir, "export-9x16.mp4"));
console.log("exported", exported);

if (withDownload) {
	const result = await page.evaluate(() => window.kroma.download("smoke-dl", "https://www.youtube.com/watch?v=jNQXAC9IVRw"));
	console.log("downloaded", { name: result.media.name, duration: result.media.duration, subs: result.media.siteSubtitles });
}

console.log(errors.length ? `renderer errors:\n${errors.join("\n")}` : "no renderer errors");
await app.close();
