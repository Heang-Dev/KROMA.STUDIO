// Copies the app's design tokens (src/renderer/src/tokens.css) into the site, so both always look the same.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const from = join(import.meta.dirname, "..", "..", "src", "renderer", "src", "tokens.css");
const to = join(import.meta.dirname, "..", "app", "tokens.css");
if (existsSync(from)) {
	copyFileSync(from, to);
	console.log("tokens: synced from the app");
} else if (!existsSync(to)) {
	throw new Error("tokens.css is missing: run this inside the Kroma Studio repo");
}
