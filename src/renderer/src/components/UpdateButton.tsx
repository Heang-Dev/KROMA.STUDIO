import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Loader2, RotateCw } from "lucide-react";
import type { UpdateState } from "@shared/types";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/state/store";

/** The update state from the main process, kept current. */
export function useUpdateState(): UpdateState | null {
	const [state, setState] = useState<UpdateState | null>(null);
	useEffect(() => {
		void window.kroma.getUpdateState().then(setState);
		return window.kroma.onUpdateState(setState);
	}, []);
	return state;
}

const clean = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

/**
 * The title bar's update button, like Orca's and Trae's: quiet while a new version downloads, then "Restart to update".
 * Nothing shows while Kroma is up to date.
 */
export function UpdateButton() {
	const state = useUpdateState();
	const announced = useRef<string | null>(null);

	// Say it once when a new version is ready.
	useEffect(() => {
		if (state?.status === "ready" && state.version && announced.current !== state.version) {
			announced.current = state.version;
			useEditor.getState().showToast(`Kroma ${state.version} is ready`, "info", "Press “Restart to update” at the top whenever you like. Your project is saved.");
		}
	}, [state?.status, state?.version]);

	if (!state) return null;
	const install = () => window.kroma.installUpdate().catch((e) => useEditor.getState().showToast("Couldn't update", "error", clean(e)));

	if (state.status === "downloading") {
		return (
			<span className="mr-2 flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums" title={`Downloading Kroma ${state.version ?? ""}`}>
				<Loader2 className="size-3.5 animate-spin" /> Updating{state.progress !== undefined ? ` ${Math.round(state.progress * 100)}%` : "…"}
			</span>
		);
	}
	if (state.status === "ready") {
		return (
			<Button size="xs" className="mr-2 gap-1.5 bg-success text-white hover:bg-success/90" title={`Restart into Kroma ${state.version}`} onClick={() => void install()}>
				<RotateCw /> Restart to update
			</Button>
		);
	}
	if (state.status === "available") {
		return (
			<Button
				size="xs"
				variant="outline"
				className="mr-2 gap-1.5"
				title={`Kroma ${state.version} is available`}
				onClick={() => void window.kroma.downloadUpdate().catch((e) => useEditor.getState().showToast("Couldn't download the update", "error", clean(e)))}
			>
				<ArrowDownToLine /> Update to {state.version}
			</Button>
		);
	}
	return null;
}
