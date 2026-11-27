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

/** The system's file browser, for "Show in …". */
export const fileBrowser = isMac ? "Finder" : isWindows ? "File Explorer" : "Files";
