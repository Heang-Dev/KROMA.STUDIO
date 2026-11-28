import type { KromaApi } from "./index";

declare global {
	interface Window {
		kroma: KromaApi;
		/** "darwin", "win32" or "linux". */
		kromaPlatform: string;
		/** The interface language the window opened in: "en" or "km". */
		kromaLanguage: string;
	}
}
