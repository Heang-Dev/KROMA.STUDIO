// CI: an old build (packaged as 0.0.1) must find the latest release on GitHub, download it in the background and
// end up "ready" (the title bar would show "Restart to update").
// Usage: node scripts/ci-update.mjs <path to the packaged app's executable>
import { _electron as electron } from "playwright";

const [exe] = process.argv.slice(2);
const app = await electron.launch({
	executablePath: exe,
	args: process.platform === "linux" ? ["--no-sandbox"] : [],
	// Test mode (a separate settings folder), with the updater on.
	env: { ...process.env, KROMA_SMOKE: "1", KROMA_UPDATE_TEST: "1", APPIMAGE: process.platform === "linux" ? exe : "" },
});
const page = await app.firstWindow();
await page.waitForFunction(() => window.kroma, null, { timeout: 30000 });
const start = Date.now();
let state;
for (;;) {
	state = await page.evaluate(() => window.kroma.getUpdateState());
	if (state.status === "ready" || state.status === "error") break;
	if (Date.now() - start > 6 * 60_000) break;
	await new Promise((r) => setTimeout(r, 3000));
}
console.log(JSON.stringify(state));
await app.close();
if (state.status !== "ready") {
	console.error(`✗ the update didn't download: ${state.status} ${state.error ?? ""}`);
	process.exit(1);
}
console.log(`✓ found and downloaded ${state.version} in ${Math.round((Date.now() - start) / 1000)} s`);
