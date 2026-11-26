import { describe, expect, it } from "vitest";
import { KVS_TEMPLATES, VOICE_GROUPS, groupTemplates } from "./types";

describe("preset voice groups", () => {
	it("puts every template in a named group, once", () => {
		const grouped = groupTemplates(KVS_TEMPLATES);
		expect(grouped.map((g) => g.title)).not.toContain("More");
		expect(grouped.flatMap((g) => g.items).length).toBe(KVS_TEMPLATES.length);
	});
	it("only names templates that exist", () => {
		const names = new Set(KVS_TEMPLATES.map((t) => t.name));
		expect(VOICE_GROUPS.flatMap((g) => g.names).filter((n) => !names.has(n))).toEqual([]);
	});
	it("keeps unknown engine presets under More", () => {
		expect(groupTemplates([{ name: "Robot" }]).map((g) => g.title)).toEqual(["More"]);
	});
});
