// Real test against a running KVS engine: designed voice + cloning. Uses your settings (engine address/token).
// Usage: KROMA_APP=... node scripts/kvs-test.mjs <recording-for-clone>
import { _electron as electron } from "playwright";
const [recording] = process.argv.slice(2);
const app = await electron.launch({ ...(process.env.KROMA_APP ? { executablePath: process.env.KROMA_APP, args: [] } : { args: ["."] }), env: { ...process.env, KROMA_E2E: "1" } });
const page = await app.firstWindow();
await page.waitForFunction(() => window.__kroma, null, { timeout: 15000 });
const time = async (label, fn, arg) => {
	const t = Date.now();
	try {
		const r = await page.evaluate(fn, arg);
		console.log(`\n✔ ${label} (${((Date.now() - t) / 1000).toFixed(1)} s)\n${JSON.stringify(r, null, 1)}`);
		return r;
	} catch (e) {
		console.log(`\n✘ ${label}: ${e.message.split("\n")[0]}`);
	}
};
const status = await time("engine status", async () => {
	const s = await window.kroma.kvsStatus();
	return { online: s.online, device: s.device, presets: s.presets.map((p) => p.name), error: s.error };
});
if (!status?.online) process.exit(1);

const lines = [
	{ id: "a", text: "សួស្តី សូមស្វាគមន៍មកកាន់ឆានែលរបស់យើង។" },
	{ id: "b", text: "មើលទូរសព្ទយូរៗទៅ ភ្នែកប្រាកដជាស្ងួតហើយ។" },
	{ id: "c", text: "វិធីនេះចំណាយពេលតែ ៣០ វិនាទីប៉ុណ្ណោះ។" },
];
await time("designed voice: Narrator (clear female), 3 lines", async (lines) => {
	const r = await window.kroma.voiceOver(`voice-${Date.now()}`, lines, "kvs-design:Narrator (clear female)", 0);
	return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { seconds: Number(v.duration.toFixed(2)), file: v.path.split("/").pop() }]));
}, lines);

const voice = await time("clone a voice from the recording", async (rec) => {
	const v = await window.kroma.cloneVoice(`clone-${Date.now()}`, "Test clone", rec);
	return v;
}, recording);
if (voice) {
	await time("cloned voice, 3 lines", async ({ lines, id }) => {
		const r = await window.kroma.voiceOver(`voice-${Date.now()}`, lines, `kvs-clone:${id}`, 0);
		return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { seconds: Number(v.duration.toFixed(2)), path: v.path }]));
	}, { lines, id: voice.id });
}
await app.close();
