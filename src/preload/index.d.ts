import type { KromaApi } from "./index";

declare global {
	interface Window {
		kroma: KromaApi;
	}
}
