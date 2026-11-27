// Adds each sample's real waveform ("peaks", BARS values 0–1) to lib/voices.json, the way Kroma's player draws it.
// Run after changing the samples: node scripts/voice-peaks.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BARS = 64;
const voices = JSON.parse(readFileSync("lib/voices.json", "utf8"));
for (const v of voices) {
	const raw = execFileSync("ffmpeg", ["-v", "error", "-i", `public${v.file}`, "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], { maxBuffer: 64 << 20 });
	const s = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
	const per = Math.floor(s.length / BARS) || 1;
	const peaks = Array.from({ length: BARS }, (_, i) => {
		let p = 0;
		for (let j = i * per; j < Math.min(s.length, (i + 1) * per); j++) p = Math.max(p, Math.abs(s[j]));
		return p;
	});
	const loudest = Math.max(...peaks, 0.01);
	v.peaks = peaks.map((p) => Math.round(Math.max(0.06, p / loudest) * 100) / 100);
}
writeFileSync("lib/voices.json", JSON.stringify(voices, null, 1) + "\n");
console.log(`peaks for ${voices.length} voices`);
