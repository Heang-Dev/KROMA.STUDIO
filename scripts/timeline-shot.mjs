// Screenshot the timeline with a real video (filmstrip + waveform). Uses your settings but makes no AI calls.
// Usage: KROMA_APP=... node scripts/timeline-shot.mjs <video> <out.png>
import { writeFileSync } from "node:fs";
import { _electron as electron } from "playwright";
const [video, out] = process.argv.slice(2);
const app = await electron.launch({ ...(process.env.KROMA_APP ? { executablePath: process.env.KROMA_APP, args: [] } : { args: ["."] }), env: { ...process.env, KROMA_E2E: "1" } });
const page = await app.firstWindow();
await page.waitForFunction(() => window.__kroma, null, { timeout: 15000 });
const t = Date.now();
await page.evaluate(async (path) => {
	const media = await window.kroma.probe(path);
	window.__kroma.useEditor.getState().closeSettings();
	window.__kroma.actions.addMedia([media]);
	await window.kroma.visuals(media.path, media.duration);
}, video);
console.log(`visuals ready in ${((Date.now() - t) / 1000).toFixed(1)} s`);
await page.waitForTimeout(1500);
const png = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString("base64"));
writeFileSync(out, Buffer.from(png, "base64"));
await app.close();
