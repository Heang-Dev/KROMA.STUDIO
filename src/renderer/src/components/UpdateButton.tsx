import { useEffect, useState } from "react";
import { ArrowDownToLine, Loader2, Minimize2, RefreshCw, RotateCw } from "lucide-react";
import type { UpdateState } from "@shared/types";
import { t } from "@shared/i18n";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/state/store";
import { cn } from "@/lib/utils";
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
const install = () => window.kroma.installUpdate().catch((e) => useEditor.getState().showToast(t("Couldn't update"), "error", clean(e)));
const download = () => window.kroma.downloadUpdate().catch((e) => useEditor.getState().showToast(t("Couldn't download the update"), "error", clean(e)));

/** "2.4 MB/s · 35 s left" while downloading, once the speed is known. */
export function transferText(state: Pick<UpdateState, "speed" | "secondsLeft">): string {
	if (!state.speed) return "";
	const speed = state.speed >= 1024 * 1024 ? `${(state.speed / (1024 * 1024)).toFixed(1)} MB/s` : `${Math.max(1, Math.round(state.speed / 1024))} KB/s`;
	const left = state.secondsLeft;
	if (left === undefined || !Number.isFinite(left)) return speed;
	const time = left < 60 ? `${Math.max(1, Math.round(left))} s` : left < 3600 ? `${Math.round(left / 60)} min` : `${(left / 3600).toFixed(1)} h`;
	return `${speed} · ${t("{time} left", { time })}`;
}

// Minimize (or "Later") tucks the card into the status bar for that version; the status bar keeps a small "Restart to update" so it's never lost.
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
	const title = ready ? t("Kroma {version} is ready", { version: state.version ?? "" }) : state.status === "downloading" ? t("Downloading Kroma {version}", { version: state.version ?? "" }) : t("Kroma {version} is available", { version: state.version ?? "" });
	const detail = ready
		? t("Restart to finish updating. Your project is saved and opens again.")
		: state.status === "downloading"
			? t("It downloads in the background and picks up where it stopped if the connection drops. Keep working.")
			: t("A new version of Kroma is out.");

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed right-4 bottom-10 z-50 flex w-[340px] items-start gap-2.5 rounded-md border bg-popover p-3 pr-8 text-[13px] text-popover-foreground animate-in fade-in-0 slide-in-from-bottom-2"
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
				{state.status === "downloading" && transferText(state) && <p className="text-[11px] text-muted-foreground tabular-nums">{transferText(state)}</p>}
				{state.status !== "downloading" && (
					<div className="flex gap-2 pt-2">
						{ready ? (
							<Button size="xs" className="gap-1.5" onClick={() => void install()}>
								<RotateCw /> {t("Restart to update")}
							</Button>
						) : (
							<Button size="xs" className="gap-1.5" onClick={() => void download()}>
								<ArrowDownToLine /> {t("Download")}
							</Button>
						)}
						<Button size="xs" variant="ghost" className="text-muted-foreground" onClick={hide}>
							{t("Later")}
						</Button>
					</div>
				)}
			</div>
			<button
				type="button"
				aria-label={t("Minimize to the status bar")}
				title={t("Minimize to the status bar")}
				onClick={hide}
				className="absolute top-2.5 right-2 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-70 transition-opacity hover:text-foreground hover:opacity-100"
			>
				<Minimize2 className="size-3.5" />
			</button>
		</div>
	);
}

/**
 * The status bar's end: a minimized update (its progress, or "Restart to update"; click to open the card again), or,
 * when there's no update going on, a small button to check for one now.
 */
export function UpdateStatus() {
	const state = useUpdateState();
	const [hidden] = useHidden(state?.version);
	const [checking, setChecking] = useState(false);
	if (!state) return null;
	const active = state.status === "available" || state.status === "downloading" || state.status === "ready";
	if (active && !hidden) return null; // the card is showing

	if (state.status === "downloading") {
		const left = transferText(state).split(" · ")[1];
		return (
			<button type="button" onClick={() => showCard()} title={t("Show the update")} className="flex items-center gap-1 rounded-sm px-1 text-muted-foreground tabular-nums hover:text-foreground">
				<Loader2 className="size-3 animate-spin" /> {state.progress !== undefined ? t("Updating {percent}%", { percent: Math.round(state.progress * 100) }) : t("Updating…")}
				{left && <span className="opacity-70">· {left}</span>}
			</button>
		);
	}
	if (state.status === "ready" || state.status === "available") {
		return (
			<button type="button" onClick={() => showCard()} className="flex items-center gap-1 rounded-sm px-1 text-success hover:underline">
				{state.status === "ready" ? <RotateCw className="size-3" /> : <ArrowDownToLine className="size-3" />}
				{state.status === "ready" ? t("Restart to update") : t("Update to {version}", { version: state.version ?? "" })}
			</button>
		);
	}

	const busy = checking || state.status === "checking";
	const check = async () => {
		setChecking(true);
		try {
			const next = await window.kroma.checkForUpdates();
			if (next.status === "none") useEditor.getState().showToast(t("Kroma is up to date ({version})", { version: next.current }));
			else if (next.status === "error") useEditor.getState().showToast(t("Couldn't check for updates"), "error", next.error);
			else showCard();
		} catch (e) {
			useEditor.getState().showToast(t("Couldn't check for updates"), "error", clean(e));
		} finally {
			setChecking(false);
		}
	};
	return (
		<button
			type="button"
			disabled={busy}
			onClick={() => void check()}
			title={`Kroma ${state.current}`}
			className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70"
		>
			<RefreshCw className={cn("size-3", busy && "animate-spin")} />
			{busy ? t("Checking…") : t("Check for updates")}
		</button>
	);
}
