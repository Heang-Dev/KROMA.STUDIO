// Copies the app's 36 preset voices (name, description, group) into lib/voice-list.json for the Voices page.
// Run with bun after changing the presets in src/shared/types.ts: bun scripts/voice-list.mjs
import { writeFileSync } from "node:fs";
import { KVS_TEMPLATES, VOICE_GROUPS } from "../../src/shared/types.ts";

const groups = VOICE_GROUPS.map((g) => ({ title: g.title, voices: g.names.map((n) => KVS_TEMPLATES.find((t) => t.name === n)).filter(Boolean) }));
writeFileSync("lib/voice-list.json", JSON.stringify(groups, null, 1) + "\n");
console.log(`${groups.reduce((n, g) => n + g.voices.length, 0)} voices in ${groups.length} groups`);
