import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("lets a later height replace the control height", () => {
		expect(cn("h-control px-3", "h-auto min-h-control")).toBe("px-3 h-auto min-h-control");
		expect(cn("size-control", "size-6")).toBe("size-6");
		expect(cn("h-control-xs", "h-5")).toBe("h-5");
	});
});
