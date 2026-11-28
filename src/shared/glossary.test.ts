import { describe, expect, it } from "vitest";
import { applyGlossary, cleanGlossary, glossaryPrompt, mergeGlossary, termsIn } from "./glossary";

const terms = [
	{ source: "林风", target: "លីនហ្វេង", note: "the hero" },
	{ source: "林风哥", target: "បងលីនហ្វេង" },
	{ source: "Beijing", target: "ប៉េកាំង" },
];

describe("series glossary", () => {
	it("keeps clean, unique terms", () => {
		expect(cleanGlossary([{ source: " A ", target: " a " }, { source: "a", target: "other" }, { source: "", target: "x" }, { source: "B", target: "" }])).toEqual([{ source: "A", target: "a" }]);
	});

	it("only sends the terms the lines use, longest first", () => {
		expect(termsIn(terms, "林风哥，你好").map((t) => t.source)).toEqual(["林风哥", "林风"]);
		expect(glossaryPrompt(terms, "nothing here")).toBe("");
		expect(glossaryPrompt(terms, "welcome to beijing")).toContain("Beijing → ប៉េកាំង");
		expect(glossaryPrompt(terms, "林风")).toContain("(the hero)");
	});

	it("swaps names in before Google Translate, the longest name first", () => {
		expect(applyGlossary("林风哥来了，林风", terms)).toBe("បងលីនហ្វេង来了，លីនហ្វេង");
	});

	it("keeps the person's spelling when names are found again", () => {
		const { terms: merged, added } = mergeGlossary([{ source: "林风", target: "my spelling" }], [{ source: "林风", target: "found" }, { source: "王", target: "វ៉ាង" }]);
		expect(merged).toEqual([{ source: "林风", target: "my spelling" }, { source: "王", target: "វ៉ាង" }]);
		expect(added).toBe(1);
	});
});
