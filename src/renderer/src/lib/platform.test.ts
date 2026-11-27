import { describe, expect, it } from "vitest";
import { keyLabel } from "./platform";

describe("shortcut labels", () => {
	it("keeps Mac symbols on a Mac", () => expect(keyLabel("⇧⌘Z", true)).toBe("⇧⌘Z"));
	it("uses Ctrl elsewhere", () => {
		expect(keyLabel("⌘S", false)).toBe("Ctrl+S");
		expect(keyLabel("⇧⌘Z", false)).toBe("Ctrl+Shift+Z");
		expect(keyLabel("⌘,", false)).toBe("Ctrl+,");
	});
});
