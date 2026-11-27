import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/ui/command", () => ({}));
vi.mock("@/components/ui/popover", () => ({}));
const { matchesAllWords } = await import("@/components/SearchSelect");

describe("dropdown search", () => {
	it("matches whole-word starts for Latin words, any order", () => {
		expect(matchesAllWords("King (majestic) · A powerful king", "king")).toBe(true);
		expect(matchesAllWords("Villainess (cruel) · cold and mocking", "king")).toBe(false);
		expect(matchesAllWords("Young girl · A sweet eight-year-old girl", "girl young")).toBe(true);
		expect(matchesAllWords("Narrator (deep male)", "nar")).toBe(true);
	});
	it("matches Khmer and Chinese anywhere", () => {
		expect(matchesAllWords("ម្ដាយ · Mother", "ដាយ")).toBe(true);
		expect(matchesAllWords("小漫知识库", "知识")).toBe(true);
	});
	it("is not confused by symbols in the search", () => {
		expect(matchesAllWords("C++ (test)", "(test")).toBe(true);
	});
});
