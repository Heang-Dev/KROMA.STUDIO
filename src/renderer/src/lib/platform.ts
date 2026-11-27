// Which system Kroma runs on, for the title bar, shortcut labels and a few words ("Finder" vs "File Explorer").

export const platform: string = typeof window !== "undefined" && window.kromaPlatform ? window.kromaPlatform : "darwin";
export const isMac = platform === "darwin";
export const isWindows = platform === "win32";

/** "⌘S" on a Mac, "Ctrl+S" on Windows and Linux ("⇧⌘Z" → "Ctrl+Shift+Z"). */
export function keyLabel(shortcut: string, mac = isMac): string {
	if (mac) return shortcut;
	const shift = shortcut.includes("⇧");
	const alt = shortcut.includes("⌥");
	const rest = shortcut.replace(/[⇧⌘⌥]/g, "");
	return `Ctrl+${alt ? "Alt+" : ""}${shift ? "Shift+" : ""}${rest}`;
}

/** Key caps for a shortcut: Mac symbols on a Mac; Ctrl, Shift, Alt and Backspace elsewhere, Ctrl first. */
export function keyCaps(keys: string[], mac = isMac): string[] {
	if (mac) return keys;
	const names: Record<string, string> = { "⌘": "Ctrl", "⇧": "Shift", "⌥": "Alt", "⌫": "Backspace" };
	const order = ["Ctrl", "Shift", "Alt"];
	const mapped = keys.map((k) => names[k] ?? k);
	return [...order.filter((m) => mapped.includes(m)), ...mapped.filter((k) => !order.includes(k))];
}

/** The system's file browser, for "Show in …". */
export const fileBrowser = isMac ? "Finder" : isWindows ? "File Explorer" : "Files";
