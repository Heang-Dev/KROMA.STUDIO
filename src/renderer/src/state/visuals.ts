import { useEffect } from "react";
import { create } from "zustand";
import type { MediaItem, MediaVisuals } from "@shared/types";

// Filmstrip frames and waveform per video file, requested once and shared by every clip of that file.

interface VisualsState {
	byPath: Record<string, MediaVisuals | "loading" | "failed">;
}

export const useVisualsStore = create<VisualsState>(() => ({ byPath: {} }));

export function useMediaVisuals(media: MediaItem | undefined): MediaVisuals | null {
	const entry = useVisualsStore((s) => (media ? s.byPath[media.path] : undefined));
	useEffect(() => {
		if (!media || useVisualsStore.getState().byPath[media.path]) return;
		const set = (value: VisualsState["byPath"][string]) => useVisualsStore.setState((s) => ({ byPath: { ...s.byPath, [media.path]: value } }));
		set("loading");
		window.kroma.visuals(media.path, media.duration).then(set, () => set("failed"));
	}, [media]);
	return entry && typeof entry === "object" ? entry : null;
}
