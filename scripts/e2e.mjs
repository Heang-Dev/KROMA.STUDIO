// Real end-to-end run with YOUR settings and keys (no fake services): video → Chinese lines → Khmer → posts → export.
// Usage: bun run dist && KROMA_APP="dist/mac-arm64/Kroma Studio.app/Contents/MacOS/Kroma Studio" node scripts/e2e.mjs <video.mp4> <out-dir>
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { _electron as electron } from "playwright";

const [video, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const app = await electron.launch({ ...(process.env.KROMA_APP ? { executablePath: process.env.KROMA_APP, args: [] } : { args: ["."] }), env: { ...process.env, KROMA_E2E: "1" } });
const page = await app.firstWindow();
page.on("pageerror", (e) => console.log("page error:", e.message));
await page.waitForFunction(() => window.__kroma, null, { timeout: 15000 });

const step = async (name, fn, arg) => {
	const t = Date.now();
	try {
		const result = await page.evaluate(fn, arg);
		console.log(`\n✔ ${name} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
		console.log(JSON.stringify(result, null, 1));
		return result;
	} catch (err) {
		console.log(`\n✘ ${name}: ${err.message.split("\n")[0]}`);
		return null;
	}
};

const settings = await step("settings", async () => {
	const s = await window.kroma.getSettings();
	return { translator: s.translateProvider, speech: s.asrProvider === "gemini" ? "gemini" : s.asrBaseUrl, geminiModel: s.geminiModel, hasGeminiKey: s.hasGeminiKey, hasAsrKey: s.hasAsrKey, hasAnthropicKey: s.hasAnthropicKey, canTranscribe: s.asrProvider === "gemini" ? s.hasGeminiKey : s.hasAsrKey };
});

await step("load video", async (path) => {
	const { actions, useEditor } = window.__kroma;
	const media = await window.kroma.probe(path);
	actions.addMedia([media]);
	return { name: media.name, duration: media.duration, size: `${media.width}x${media.height}`, clips: useEditor.getState().project.clips.length };
}, video);

// Helpers defined inside the page (the app's security policy forbids evaluating strings as code).
await page.evaluate(() => {
	window.sample = () => {
		const cues = window.__kroma.useEditor.getState().project.cues;
		return { lines: cues.length, translated: cues.filter((c) => c.text.trim()).length, first: cues.slice(0, 12).map((c) => `${c.start.toFixed(1)}–${c.end.toFixed(1)}s  ${c.source}  →  ${c.text}`) };
	};
	window.errors = () => Object.values(window.__kroma.useEditor.getState().tasks).filter((t) => t.status === "error").map((t) => `${t.label}: ${t.error}`);
});

if (settings?.canTranscribe) {
	await step("speech to text (cloud)", async () => {
		const { actions } = window.__kroma;
		const media = actions.mainMedia();
		await actions.getSubtitles(media, { kind: "cloud", language: "zh" });
		return { ...sample(), notice: window.__kroma.useEditor.getState().toast?.text, errors: errors() };
	});
} else {
	console.log("\n(no speech-to-text key: using sample Chinese lines instead of the video's speech)");
	await page.evaluate(() => {
		const lines = ["你可以用眼过度，但一定要懂得暴力恢复。", "长时间看手机，眼睛会又干又涩。", "这个方法只需要三十秒。", "先把双手搓热，然后轻轻捂住眼睛。", "我们走吧，别再熬夜了！"];
		window.__kroma.useEditor.getState().update((p) => ({ ...p, cues: lines.map((source, i) => ({ id: `s${i}`, start: i * 4 + 0.5, end: i * 4 + 3.5, source, text: "" })) }));
	});
}

if (process.env.E2E_ONLY === "speech") {
	await app.close();
	process.exit(0);
}

await step(`translate to Khmer (${settings?.translator})`, async () => {
	await window.__kroma.actions.translateCues(false);
	return { ...sample(), notice: window.__kroma.useEditor.getState().toast?.text, errors: errors() };
});

await step("write social posts", async () => {
	const { useEditor } = window.__kroma;
	const p = useEditor.getState().project;
	const transcript = p.cues.filter((c) => c.text.trim()).map((c) => c.text).join("\n");
	const posts = await window.kroma.captions(`e2e-captions-${Date.now()}`, { transcript, title: p.name, context: p.context });
	return posts.map((x) => ({ platform: x.platform, title: x.title, hashtags: x.hashtags.slice(0, 6) }));
});

await step("export 9:16 with Khmer subtitles (first 40 s)", async (out) => {
	const { useEditor, render } = window.__kroma;
	useEditor.getState().update((p) => ({ ...p, aspect: "9:16", cues: p.cues.filter((c) => c.end <= 40), clips: p.clips.map((c, i) => (i === 0 ? { ...c, out: Math.min(c.out, 40) } : c)) }));
	const project = useEditor.getState().project;
	const frame = { width: 1080, height: 1920 };
	await render.ensureFonts();
	const band = render.subtitleBand(project.style, frame);
	const overlays = [];
	for (const cue of project.cues.filter((c) => c.end <= 40 && (c.text || c.source).trim())) overlays.push({ start: cue.start, end: cue.end, png: await render.renderBandPng(cue, project.style, frame, band) });
	const media = project.media[0];
	await window.kroma.exportVideo(`e2e-export-${Date.now()}`, { outPath: out, ...frame, fit: "blur", clips: project.clips.map((c) => ({ path: media.path, in: c.in, out: c.out, hasAudio: media.hasAudio })), overlays, bandTop: band.top, bandHeight: band.height, quality: "fast" });
	return { file: out, subtitleImages: overlays.length };
}, join(outDir, "e2e-9x16.mp4"));

await app.close();
