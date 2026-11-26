import { describe, expect, it } from "vitest";
import { batchLines, parseResponse } from "./google-translate";

describe("google translate helpers", () => {
	it("splits lines into requests under the size limit", () => {
		const lines = Array.from({ length: 10 }, (_, i) => ({ id: String(i), text: "你好世界" }));
		const batches = batchLines(lines, 120);
		expect(batches.length).toBeGreaterThan(1);
		expect(batches.flat()).toHaveLength(10);
	});
	it("keeps a single long line in its own batch", () => {
		expect(batchLines([{ id: "a", text: "x".repeat(500) }], 100)).toHaveLength(1);
	});
	it("joins translated segments", () => {
		expect(parseResponse([[["សួស្តី\n", "你好\n"], ["ពិភពលោក", "世界"]], null, "zh-CN"])).toBe("សួស្តី\nពិភពលោក");
		expect(parseResponse(null)).toBe("");
	});
});
