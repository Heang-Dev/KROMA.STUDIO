import { useCallback, useEffect, useState } from "react";
import { Loader2, Power } from "lucide-react";
import type { KvsStatus } from "@shared/types";
import { t } from "@shared/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { notify as notifyDone } from "@/lib/notify";

// The voice engine's state, shared by every place that shows it (status bar, Story studio): one poll for the whole
// window, and one start at a time.

let current: KvsStatus | null = null;
let starting = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());
let timer: ReturnType<typeof setInterval> | null = null;

/** Looks again now (after a settings change, an install, a start or a stop), so every place shows the same state. */
export async function refreshEngineStatus(): Promise<void> {
	return refresh();
}

async function refresh(): Promise<void> {
	current = await window.kroma.kvsStatus().catch(() => current);
	notify();
}

const clean = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

/** Starts the engine on this computer (Settings → Voice Engine has the details when it can't). */
export async function startEngine(): Promise<void> {
	if (starting) return;
	starting = true;
	notify();
	try {
		current = await window.kroma.kvsStart();
		notifyDone({ kind: "voices", tone: "success", title: t("The voice engine is on") });
	} catch (e) {
		notifyDone({ kind: "voices", tone: "error", title: t("Couldn't start the voice engine"), detail: clean(e), action: { kind: "view", view: "settings", section: "voice-engine" } });
	} finally {
		starting = false;
		await refresh();
	}
}

/** The engine's status (null until the first answer), whether it's starting, and a way to look again. */
export function useEngineStatus(): { status: KvsStatus | null; starting: boolean; refresh: () => Promise<void> } {
	const [, rerender] = useState(0);
	useEffect(() => {
		const f = () => rerender((n) => n + 1);
		listeners.add(f);
		if (!timer) {
			void refresh();
			timer = setInterval(() => void refresh(), 15_000);
		}
		return () => {
			listeners.delete(f);
			if (!listeners.size && timer) {
				clearInterval(timer);
				timer = null;
			}
		};
	}, []);
	return { status: current, starting, refresh: useCallback(refresh, []) };
}

/** What the dot and words say (the words in English: shown through t()). */
function describe(status: KvsStatus | null, isStarting: boolean): { dot: string; text: string } {
	if (isStarting) return { dot: "animate-pulse bg-warning", text: "Starting…" };
	if (!status) return { dot: "animate-pulse bg-muted-foreground", text: "Checking…" };
	if (status.installing) return { dot: "animate-pulse bg-warning", text: "Installing…" };
	if (status.online) return { dot: "bg-success", text: "On" };
	if (status.local && status.installed === "missing") return { dot: "bg-muted-foreground/50", text: "Not installed" };
	return { dot: "bg-destructive", text: "Off" };
}

/** Status bar: "● Voice engine on". Off: a click starts it (on this computer) or opens its settings. */
export function EngineStatusItem() {
	const { status, starting: isStarting } = useEngineStatus();
	const { dot, text } = describe(status, isStarting);
	const canStart = status && !status.online && status.local && !status.cannotStart;
	return (
		<button
			type="button"
			disabled={isStarting}
			onClick={() => (canStart ? void startEngine() : useEditor.getState().openSettings("voice-engine"))}
			title={status?.online ? t("Voice engine settings") : canStart ? t("Start the voice engine") : (status?.cannotStart ?? status?.error ?? t("Voice engine settings"))}
			className="flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
			{t("Voice engine {state}", { state: t(text).toLowerCase() })}
			{canStart && <span className="text-foreground/80">· {t("Start")}</span>}
		</button>
	);
}

/** For pages that need the engine (Story studio): "● Voice engine on" (opens its settings), plus Start when it's off. */
export function EngineChip() {
	const { status, starting: isStarting } = useEngineStatus();
	const { dot, text } = describe(status, isStarting);
	const canStart = status && !status.online && status.local && !status.cannotStart;
	return (
		<div className="flex items-center gap-2">
			<Button variant="outline" size="sm" className="gap-2 font-normal" title={t("Voice engine settings")} onClick={() => useEditor.getState().openSettings("voice-engine")}>
				<span aria-hidden className={cn("size-2 rounded-full", dot)} />
				<span className="text-muted-foreground">
					{t("Voice engine")} <span className="text-foreground">{t(text).toLowerCase()}</span>
				</span>
			</Button>
			{(canStart || isStarting) && (
				<Button variant="outline" size="sm" disabled={isStarting} onClick={() => void startEngine()}>
					{isStarting ? <Loader2 className="animate-spin" /> : <Power />} {t("Start")}
				</Button>
			)}
		</div>
	);
}
