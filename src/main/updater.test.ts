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
