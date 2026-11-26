// Makes one finished video the way a person would: speech → Khmer → voice-over → remove original voices → export.
// Uses your real settings and keys. Usage: KROMA_APP=... node scripts/make-finished.mjs <video> [voice-id] [16:9|9:16]
import { _electron as electron } from "playwright";
const [video, voice = "kvs-design:Narrator (clear female)", aspect = "16:9"] = process.argv.slice(2);
const app = await electron.launch({ ...(process.env.KROMA_APP ? { executablePath: process.env.KROMA_APP, args: [] } : { args: ["."] }), env: { ...process.env, KROMA_E2E: "1" } });
const page = await app.firstWindow();
await page.waitForFunction(() => window.__kroma, null, { timeout: 15000 });
const t0 = Date.now();
const step = async (name, fn, arg) => {
	const t = Date.now();
	const r = await page.evaluate(fn, arg);
	console.log(`✔ ${name} (${((Date.now() - t) / 1000).toFixed(0)} s) ${JSON.stringify(r)}`);
	return r;
};
const report = () => page.evaluate(() => ({ notice: window.__kroma.useEditor.getState().toast?.text, errors: Object.values(window.__kroma.useEditor.getState().tasks).filter((t) => t.status === "error").map((t) => t.error) }));
await step("load", async ({ path, aspect }) => {
	const k = window.__kroma;
	k.useEditor.getState().closeSettings();
	const media = await window.kroma.probe(path);
	k.actions.addMedia([media]);
	k.useEditor.getState().update((p) => ({ ...p, aspect, name: `${media.name.replace(/\.[^.]+$/, "")} (Khmer)` }));
	return { duration: Math.round(media.duration) };
}, { path: video, aspect });
await step("speech to text", async () => { const k = window.__kroma; await k.actions.getSubtitles(k.actions.mainMedia(), { kind: "cloud", language: "zh" }); return { lines: k.useEditor.getState().project.cues.length }; });
console.log("  ", JSON.stringify(await report()));
await step("translate", async () => { const k = window.__kroma; await k.actions.translateCues(false); const c = k.useEditor.getState().project.cues; return { translated: `${c.filter((x) => x.text).length}/${c.length}` }; });
console.log("  ", JSON.stringify(await report()));
await step(`voice-over (${voice})`, async (voice) => { const k = window.__kroma; k.actions.setVoice({ voice, enabled: true }); await k.actions.makeVoiceOver(); const v = k.useEditor.getState().project.voice; return { voiced: Object.keys(v.lines).length }; }, voice);
console.log("  ", JSON.stringify(await report()));
await step("voice timing", async () => {
	const k = window.__kroma;
	const cues = k.actions.voiceCues(k.useEditor.getState().project);
	const plan = k.planVoice(cues);
	const lag = plan.map((p, i) => p.start - cues[i].start);
	return {
		lines: plan.length,
		cut: 0,
		natural: plan.filter((p) => p.tempo <= 1.01).length,
		spedUp: plan.filter((p) => p.tempo > 1.01).length,
		averageTempo: Number((plan.reduce((a, p) => a + p.tempo, 0) / plan.length).toFixed(2)),
		maxTempo: Number(Math.max(...plan.map((p) => p.tempo)).toFixed(2)),
		maxLagSeconds: Number(Math.max(...lag).toFixed(2)),
	};
});
await step("remove original voices", async () => { const ok = await window.__kroma.actions.removeOriginalVoices("fast"); return { ok }; });
console.log("  ", JSON.stringify(await report()));
await step("export", async () => { const k = window.__kroma; await k.actions.exportVideo("fast"); return { notice: k.useEditor.getState().toast?.text }; });
const exported = await page.evaluate(() => Object.values(window.__kroma.useEditor.getState().tasks).filter((t) => t.id.startsWith("export")).map((t) => t.status));
console.log(`total ${((Date.now() - t0) / 60000).toFixed(1)} min`, JSON.stringify({ exported, ...(await report()) }));
await app.close();
