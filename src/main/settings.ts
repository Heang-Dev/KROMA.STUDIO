import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";
import { DEFAULT_SETTINGS, type Settings, type SettingsView } from "@shared/types";

// API keys are encrypted with the OS keychain (safeStorage) before they touch the disk.
const file = () => join(app.getPath("userData"), "settings.json");
const SECRET_KEYS = ["anthropicKey", "asrKey"] as const;

function encrypt(value: string): string {
	if (!value) return "";
	return safeStorage.isEncryptionAvailable() ? `enc:${safeStorage.encryptString(value).toString("base64")}` : value;
}

function decrypt(value: string): string {
	if (!value?.startsWith("enc:")) return value ?? "";
	try {
		return safeStorage.decryptString(Buffer.from(value.slice(4), "base64"));
	} catch {
		return "";
	}
}

export function loadSettings(): Settings {
	if (!existsSync(file())) return { ...DEFAULT_SETTINGS };
	try {
		const raw = JSON.parse(readFileSync(file(), "utf8")) as Partial<Settings>;
		const merged = { ...DEFAULT_SETTINGS, ...raw };
		for (const key of SECRET_KEYS) merged[key] = decrypt(merged[key]);
		return merged;
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

/** Saves the given fields. An empty secret field keeps the stored key; pass null to clear it. */
export function saveSettings(patch: Partial<Record<keyof Settings, string | number | null>>): SettingsView {
	const current = loadSettings();
	const next: Settings = { ...current };
	for (const [key, value] of Object.entries(patch) as [keyof Settings, string | number | null][]) {
		if ((SECRET_KEYS as readonly string[]).includes(key)) {
			if (value === null) (next as unknown as Record<string, unknown>)[key] = "";
			else if (typeof value === "string" && value.trim()) (next as unknown as Record<string, unknown>)[key] = value.trim();
		} else if (value !== null && value !== undefined) {
			(next as unknown as Record<string, unknown>)[key] = value;
		}
	}
	const stored: Record<string, unknown> = { ...next };
	for (const key of SECRET_KEYS) stored[key] = encrypt(next[key]);
	writeFileSync(file(), JSON.stringify(stored, null, "\t"));
	return viewOf(next);
}

export function viewOf(settings: Settings): SettingsView {
	const { anthropicKey, asrKey, ...rest } = settings;
	return { ...rest, hasAnthropicKey: Boolean(anthropicKey), hasAsrKey: Boolean(asrKey) };
}
