import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// A keychain that can be "locked", like a newly signed build the Mac won't let in yet.
const dir = mkdtempSync(join(tmpdir(), "kroma-settings-"));
const keychain = { open: true };
vi.mock("electron", () => ({
	app: { getPath: () => dir },
	safeStorage: {
		isEncryptionAvailable: () => true,
		encryptString: (v: string) => Buffer.from(`sealed:${v}`),
		decryptString: (b: Buffer) => {
			if (!keychain.open) throw new Error("keychain locked");
			return b.toString().replace(/^sealed:/, "");
		},
	},
}));
const { loadSettings, saveSettings, lockedKeys } = await import("./settings");
const file = join(dir, "settings.json");
const stored = () => JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;

describe("API keys in settings", () => {
	beforeEach(() => {
		keychain.open = true;
		writeFileSync(file, "{}");
	});
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it("keeps a key the keychain won't open, through any other save", () => {
		saveSettings({ geminiKey: "AIza-secret" });
		const sealed = stored().geminiKey;
		keychain.open = false;
		expect(loadSettings().geminiKey).toBe("");
		expect(lockedKeys()).toContain("geminiKey");
		saveSettings({ theme: "light" });
		expect(stored().geminiKey).toBe(sealed);
		keychain.open = true;
		expect(loadSettings().geminiKey).toBe("AIza-secret");
	});

	it("replaces or removes a locked key when asked to", () => {
		saveSettings({ geminiKey: "old" });
		keychain.open = false;
		loadSettings();
		saveSettings({ geminiKey: "new" });
		keychain.open = true;
		expect(loadSettings().geminiKey).toBe("new");
		saveSettings({ geminiKey: "x" });
		keychain.open = false;
		loadSettings();
		saveSettings({ geminiKey: null });
		expect(stored().geminiKey).toBe("");
	});
});
