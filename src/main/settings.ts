import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";
import { DEFAULT_SETTINGS, type Settings, type SettingsView } from "@shared/types";

// API keys are encrypted with the OS keychain (safeStorage) before they touch the disk.
const file = () => join(app.getPath("userData"), "settings.json");
const SECRET_KEYS = ["anthropicKey", "asrKey", "geminiKey", "kvsToken", "postKey"] as const;

function encrypt(value: string): string {
	if (!value) return "";
	return safeStorage.isEncryptionAvailable() ? `enc:${safeStorage.encryptString(value).toString("base64")}` : value;
}

/** Undefined when the keychain won't open it (a new, differently signed build; access denied). */
function decrypt(value: string): string | undefined {
	if (!value?.startsWith("enc:")) return value ?? "";
	try {
		return safeStorage.decryptString(Buffer.from(value.slice(4), "base64"));
	} catch {
		return undefined;
	}
}

/**
 * Keys the keychain wouldn't open this time, as stored (still encrypted). They're never written over by a save:
 * once the keychain lets Kroma in again (or the person pastes the key again), they work. Losing a key because one
 * build couldn't read it is what this prevents.
 */
const locked = new Map<string, string>();
export const lockedKeys = (): string[] => [...locked.keys()];

export function loadSettings(): Settings {
	if (!existsSync(file())) return { ...DEFAULT_SETTINGS };
	try {
		const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<Settings>;
		const merged = { ...DEFAULT_SETTINGS, ...raw };
		for (const key of SECRET_KEYS) {
			const stored = merged[key];
			const value = decrypt(stored);
			if (value === undefined) locked.set(key, stored);
			else locked.delete(key);
			merged[key] = value ?? "";
		}
		return merged;
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

let firstRunAnswer: boolean | undefined;
/**
 * True only the very first time Kroma starts on this computer (no settings yet). The settings file is made then,
 * so the next start — after a restart or an update — goes straight to work instead of to the settings.
 */
export function firstRun(): boolean {
	if (firstRunAnswer === undefined) {
		firstRunAnswer = !existsSync(file());
		if (firstRunAnswer) saveSettings({});
	}
	return firstRunAnswer;
}

/** Saves the given fields. An empty secret field keeps the stored key; pass null to clear it. */
export function saveSettings(patch: Partial<Record<keyof Settings, string | number | boolean | null>>): SettingsView {
	const current = loadSettings();
	const next: Settings = { ...current };
	for (const [key, value] of Object.entries(patch) as [keyof Settings, string | number | boolean | null][]) {
		if ((SECRET_KEYS as readonly string[]).includes(key)) {
			if (value === null) (next as unknown as Record<string, unknown>)[key] = "";
			else if (typeof value === "string" && value.trim()) (next as unknown as Record<string, unknown>)[key] = value.trim();
		} else if (value !== null && value !== undefined) {
			(next as unknown as Record<string, unknown>)[key] = value;
		}
	}
	const stored: Record<string, unknown> = { ...next };
	for (const key of SECRET_KEYS) {
		const cleared = (patch as Record<string, unknown>)[key] === null;
		// A key this build can't read stays as it was, unless the person pasted a new one or removed it.
		stored[key] = !next[key] && !cleared && locked.has(key) ? locked.get(key) : encrypt(next[key]);
		if (next[key] || cleared) locked.delete(key);
	}
	writeFileSync(file(), JSON.stringify(stored, null, "\t"));
	return viewOf(next);
}

export function viewOf(settings: Settings): SettingsView {
	const { anthropicKey, asrKey, geminiKey, kvsToken, postKey, ...rest } = settings;
	return {
		...rest,
		hasAnthropicKey: Boolean(anthropicKey),
		hasAsrKey: Boolean(asrKey),
		hasGeminiKey: Boolean(geminiKey),
		hasKvsToken: Boolean(kvsToken),
		hasPostKey: Boolean(postKey),
		lockedKeys: lockedKeys(),
	};
}
