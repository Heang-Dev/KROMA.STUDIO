import { describe, expect, it, vi } from "vitest";
vi.mock("electron", () => ({ app: { getVersion: () => "0.1.0", getPath: () => "/tmp", isPackaged: false }, BrowserWindow: { getAllWindows: () => [] }, shell: {} }));
const { isNewer } = await import("./updater");

describe("update versions", () => {
	it("finds a newer version", () => {
		expect(isNewer("0.1.1", "0.1.0")).toBe(true);
		expect(isNewer("v0.2.0", "0.1.9")).toBe(true);
		expect(isNewer("0.1.10", "0.1.9")).toBe(true);
		expect(isNewer("1.0.0", "0.9.9")).toBe(true);
	});
	it("doesn't offer the same or an older version", () => {
		expect(isNewer("0.1.0", "0.1.0")).toBe(false);
		expect(isNewer("0.1.0", "0.1.1")).toBe(false);
		expect(isNewer("0.1.0-beta", "0.1.0")).toBe(false);
	});
});

describe("update download", async () => {
	const { createServer } = await import("node:http");
	const { mkdtempSync, readFileSync, existsSync, writeFileSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const { downloadFile, smoothSpeed } = await import("./updater");
	const data = Buffer.from(Array.from({ length: 1 << 20 }, (_, i) => (i * 31) % 251));

	/** Serves `data` with Range support; the first `drops` full requests stop halfway. */
	async function serve(drops: number) {
		const ranges: (string | undefined)[] = [];
		const server = createServer((req, res) => {
			ranges.push(req.headers.range);
			const from = Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1] ?? 0);
			const body = data.subarray(from);
			res.writeHead(from ? 206 : 200, { "Content-Length": body.length, ...(from ? { "Content-Range": `bytes ${from}-${data.length - 1}/${data.length}` } : {}) });
			if (drops-- > 0) {
				res.write(body.subarray(0, body.length >> 1), () => res.destroy());
			} else res.end(body);
		});
		await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
		const { port } = server.address() as { port: number };
		return { url: `http://127.0.0.1:${port}/kroma.dmg`, ranges, close: () => server.close() };
	}

	it("picks up where a dropped connection stopped", async () => {
		const server = await serve(1);
		const to = join(mkdtempSync(join(tmpdir(), "kroma-update-")), "kroma.dmg");
		await downloadFile(server.url, to, data.length, () => undefined, async () => undefined);
		server.close();
		expect(readFileSync(to).equals(data)).toBe(true);
		expect(existsSync(`${to}.part`)).toBe(false);
		expect(server.ranges[0]).toBeUndefined();
		expect(server.ranges[1]).toMatch(/^bytes=\d+-$/);
		expect(Number(server.ranges[1]?.match(/\d+/)?.[0])).toBeGreaterThan(0);
	});

	it("resumes a half-finished download left by an earlier run", async () => {
		const server = await serve(0);
		const to = join(mkdtempSync(join(tmpdir(), "kroma-update-")), "kroma.dmg");
		writeFileSync(`${to}.part`, data.subarray(0, 1000));
		await downloadFile(server.url, to, data.length, () => undefined, async () => undefined);
		server.close();
		expect(server.ranges).toEqual(["bytes=1000-"]);
		expect(readFileSync(to).equals(data)).toBe(true);
	});

	it("smooths the speed so the time left doesn't jump", () => {
		expect(smoothSpeed(undefined, 100)).toBe(100);
		expect(smoothSpeed(100, 200)).toBe(125);
	});
});

describe("checking for updates with automatic downloads off", async () => {
	const { checkForUpdates } = await import("./updater");
	// Mac and Linux .deb check GitHub Releases themselves (this path); Windows goes through electron-updater, whose
	// autoDownload follows the same setting but can't run in a unit test.
	it.skipIf(process.platform === "win32")("only says a new version is out, and downloads nothing", async () => {
		const calls: string[] = [];
		const realFetch = globalThis.fetch;
		globalThis.fetch = (async (url: string) => {
			calls.push(String(url));
			return new Response(JSON.stringify({ tag_name: "v9.9.9", body: "notes", html_url: "https://example.com/r", assets: [{ name: "Kroma-Studio-9.9.9-arm64.dmg", browser_download_url: "https://example.com/k.dmg", size: 100 }] }), { status: 200 });
		}) as typeof fetch;
		try {
			const state = await checkForUpdates(false);
			expect(state.status).toBe("available");
			expect(state.version).toBe("9.9.9");
			expect(calls).toEqual(["https://api.github.com/repos/Heang-Dev/kroma/releases/latest"]);
		} finally {
			globalThis.fetch = realFetch;
		}
	});
});
