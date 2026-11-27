import { useEffect, useState } from "react";
import { ArrowDownToLine, Loader2, RotateCw, X } from "lucide-react";
import type { UpdateState } from "@shared/types";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/state/store";
import { ProgressBar } from "./common";

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
const install = () => window.kroma.installUpdate().catch((e) => useEditor.getState().showToast("Couldn't update", "error", clean(e)));
const download = () => window.kroma.downloadUpdate().catch((e) => useEditor.getState().showToast("Couldn't download the update", "error", clean(e)));

// "Later" hides the card for that version; the status bar keeps a small "Restart to update" so it's never lost.
// Shared between the card and the status bar (one window, one update).
let hiddenFor: string | null = null;
const listeners = new Set<() => void>();
function useHidden(version: string | undefined): [boolean, () => void] {
	const [, rerender] = useState(0);
	useEffect(() => {
		const f = () => rerender((n) => n + 1);
		listeners.add(f);
		return () => void listeners.delete(f);
	}, []);
	const hide = () => {
		hiddenFor = version ?? null;
		listeners.forEach((f) => f());
	};
	const show = () => {
		hiddenFor = null;
		listeners.forEach((f) => f());
	};
	showCard = show;
	return [Boolean(version) && hiddenFor === version, hide];
}
let showCard: () => void = () => undefined;

/**
 * The update card, bottom right like Orca's: it appears while a new version downloads, then offers "Restart to
 * update". Nothing shows while Kroma is up to date.
 */
export function UpdateNotice() {
	const state = useUpdateState();
	const [hidden, hide] = useHidden(state?.version);
	const visible = state && (state.status === "available" || state.status === "downloading" || state.status === "ready") && !hidden;
	if (!visible) return null;

	const ready = state.status === "ready";
	const title = ready ? `Kroma ${state.version} is ready` : state.status === "downloading" ? `Downloading Kroma ${state.version ?? ""}` : `Kroma ${state.version} is available`;
	const detail = ready ? "Restart to finish updating. Your project is saved and opens again." : state.status === "downloading" ? "It downloads in the background. Keep working." : "A new version of Kroma is out.";

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed right-4 bottom-10 z-50 flex w-[340px] items-start gap-2.5 rounded-md border bg-popover p-3 pr-8 text-[13px] text-popover-foreground shadow-lg shadow-black/20 animate-in fade-in-0 slide-in-from-bottom-2"
		>
			<span className="mt-px flex size-4 shrink-0 items-center justify-center text-muted-foreground">
				{ready ? <RotateCw className="size-4 text-success" /> : state.status === "downloading" ? <Loader2 className="size-4 animate-spin" /> : <ArrowDownToLine className="size-4" />}
			</span>
			<div className="min-w-0 flex-1 space-y-0.5">
				<p className="leading-snug font-medium">{title}</p>
				<p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
				{state.status === "downloading" && (
					<div className="flex items-center gap-2 pt-1.5">
						<ProgressBar value={state.progress ?? -1} />
						{state.progress !== undefined && <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">{Math.round(state.progress * 100)}%</span>}
					</div>
				)}
				{state.status !== "downloading" && (
					<div className="flex gap-2 pt-2">
						{ready ? (
							<Button size="xs" className="gap-1.5" onClick={() => void install()}>
								<RotateCw /> Restart to update
							</Button>
						) : (
							<Button size="xs" className="gap-1.5" onClick={() => void download()}>
								<ArrowDownToLine /> Download
							</Button>
						)}
						<Button size="xs" variant="ghost" className="text-muted-foreground" onClick={hide}>
							Later
						</Button>
					</div>
				)}
			</div>
			<button
				type="button"
				aria-label="Hide"
				onClick={hide}
				className="absolute top-2.5 right-2 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-70 transition-opacity hover:text-foreground hover:opacity-100"
			>
				<X className="size-3.5" />
			</button>
		</div>
	);
}

/** The status bar's quiet reminder once the card is hidden: progress, or "Restart to update". */
export function UpdateStatus() {
	const state = useUpdateState();
	const [hidden] = useHidden(state?.version);
	if (!state || !hidden) return null;
	if (state.status === "downloading") {
		return (
			<span className="flex items-center gap-1 text-muted-foreground tabular-nums">
				<Loader2 className="size-3 animate-spin" /> Updating{state.progress !== undefined ? ` ${Math.round(state.progress * 100)}%` : "…"}
			</span>
		);
	}
	if (state.status === "ready" || state.status === "available") {
		return (
			<button type="button" onClick={() => showCard()} className="flex items-center gap-1 rounded-sm px-1 text-success hover:underline">
				{state.status === "ready" ? <RotateCw className="size-3" /> : <ArrowDownToLine className="size-3" />}
				{state.status === "ready" ? "Restart to update" : `Update to ${state.version}`}
			</button>
		);
	}
	return null;
}
