import { describe, expect, it, vi } from "vitest";
vi.mock("electron", () => ({ app: { getPath: () => "/tmp" }, nativeImage: {} }));
const { blurRadii } = await import("./export");

describe("blur box radii", () => {
	it("keeps a thin subtitle strip's blur under FFmpeg's limits", () => {
		// the failing case: 908x86 box asking for 24 (chroma must be < 86/4 = 21.5)
		expect(blurRadii(24, 908, 86)).toEqual({ luma: 24, chroma: 21 });
	});
	it("leaves a big box's blur as asked", () => {
		expect(blurRadii(20, 600, 400)).toEqual({ luma: 20, chroma: 20 });
	});
	it("never goes below 1", () => {
		expect(blurRadii(30, 4, 4)).toEqual({ luma: 1, chroma: 1 });
	});
});
