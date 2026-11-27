import { describe, expect, it } from "vitest";
import { en } from "./en";
import { km } from "./km";
import { langOf, localize, switchPath } from "./index";

describe("site languages", () => {
	it("localizes links", () => {
		expect(localize("/docs/", "km")).toBe("/km/docs/");
		expect(localize("/#faq", "km")).toBe("/km/#faq");
		expect(localize("/", "km")).toBe("/km/");
		expect(localize("/docs/", "en")).toBe("/docs/");
		expect(localize("https://github.com/x", "km")).toBe("https://github.com/x");
	});
	it("switches to the same page in the other language", () => {
		expect(switchPath("/docs/", "km")).toBe("/km/docs/");
		expect(switchPath("/km/docs/", "en")).toBe("/docs/");
		expect(switchPath("/km/", "en")).toBe("/");
		expect(switchPath("/", "km")).toBe("/km/");
	});
	it("knows the page's language", () => {
		expect(langOf("/km/changelog/")).toBe("km");
		expect(langOf("/kmz/")).toBe("en");
		expect(langOf("/")).toBe("en");
	});
	it("has the same number of items in both languages", () => {
		expect(km.workflow.steps.length).toBe(en.workflow.steps.length);
		expect(km.faq.items.length).toBe(en.faq.items.length);
		expect(km.compare.rows.length).toBe(en.compare.rows.length);
		expect(km.features.items.length).toBe(en.features.items.length);
	});
});
