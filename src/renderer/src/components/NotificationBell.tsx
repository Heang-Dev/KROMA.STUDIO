import { useEffect, useState } from "react";
import { Bell, CircleCheck, CircleX, Info } from "lucide-react";
import { type NoticeEntry, actionLabel, relativeTime } from "@shared/notify";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { canRun, runAction } from "@/lib/notify";
import { platform } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { unreadCount, useNotifications } from "@/state/notifications";
import { IconButton } from "./common";

/** The bell in the title bar: finished and failed work, newest first. Opening it marks everything read. */
export function NotificationBell() {
	const entries = useNotifications((s) => s.entries);
	const unread = unreadCount(entries);
	const [open, setOpen] = useState(false);
	// What was new when the list opened stays marked while it's open.
	const [fresh, setFresh] = useState<Set<string>>(new Set());
	const [, tick] = useState(0);
	useEffect(() => {
		if (!open) return;
		const timer = setInterval(() => tick((n) => n + 1), 30_000);
		return () => clearInterval(timer);
	}, [open]);

	const onOpenChange = (next: boolean) => {
		if (next) {
			setFresh(new Set(useNotifications.getState().entries.filter((e) => !e.read).map((e) => e.id)));
			useNotifications.getState().markAllRead();
		}
		setOpen(next);
	};

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<IconButton label={unread ? `Notifications (${unread} new)` : "Notifications"} className="relative">
					<Bell />
					{unread > 0 && (
						<span
							aria-hidden
							className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-sidebar bg-primary px-1 text-[9px] leading-none font-semibold text-primary-foreground tabular-nums"
						>
							{unread > 9 ? "9+" : unread}
						</span>
					)}
				</IconButton>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="flex w-[380px] flex-col p-0" aria-label="Notifications" onOpenAutoFocus={(e) => e.preventDefault()}>
				<div className="flex h-11 shrink-0 items-center gap-1 border-b pr-2 pl-3.5">
					<h2 className="flex-1 text-[13px] font-semibold">Notifications</h2>
					<Button variant="ghost" size="xs" disabled={!entries.some((e) => !e.read)} onClick={() => useNotifications.getState().markAllRead()}>
						Mark all read
					</Button>
					<Button variant="ghost" size="xs" disabled={!entries.length} onClick={() => useNotifications.getState().clear()}>
						Clear
					</Button>
				</div>
				{entries.length === 0 ? (
					<p className="px-4 py-10 text-center text-xs text-muted-foreground">Nothing yet — finished and failed work shows here.</p>
				) : (
					<ul className="max-h-[min(480px,70vh)] divide-y overflow-y-auto overscroll-contain" data-testid="notification-list">
						{entries.map((entry) => (
							<NoticeRow key={entry.id} entry={entry} fresh={fresh.has(entry.id)} onRun={() => setOpen(false)} />
						))}
					</ul>
				)}
			</PopoverContent>
		</Popover>
	);
}

const TONE_ICON = {
	success: <CircleCheck className="size-4 text-success" aria-label="Done" />,
	error: <CircleX className="size-4 text-destructive" aria-label="Failed" />,
	info: <Info className="size-4 text-muted-foreground" aria-label="Info" />,
};

function NoticeRow({ entry, fresh, onRun }: { entry: NoticeEntry; fresh: boolean; onRun: () => void }) {
	const runnable = canRun(entry);
	return (
		<li className={cn("flex items-start gap-2.5 px-3.5 py-2.5", fresh && "bg-accent/40")}>
			<span className="mt-px flex size-4 shrink-0 items-center justify-center">{TONE_ICON[entry.tone]}</span>
			<div className="min-w-0 flex-1 space-y-0.5">
				<p className="truncate text-[13px] leading-snug font-medium" title={entry.title}>
					{entry.title}
				</p>
				{entry.detail && (
					<p className="line-clamp-2 text-xs leading-relaxed break-words text-muted-foreground select-text" title={entry.detail}>
						{entry.detail}
					</p>
				)}
				<div className="flex items-center gap-2 pt-1">
					<time className="text-[11px] text-muted-foreground tabular-nums" dateTime={new Date(entry.time).toISOString()} title={new Date(entry.time).toLocaleString()}>
						{relativeTime(entry.time)}
					</time>
					{entry.action && runnable && (
						<Button
							variant="outline"
							size="xs"
							className="ml-auto max-w-[60%]"
							onClick={() => {
								onRun();
								void runAction(entry);
							}}
						>
							<span className="truncate">{actionLabel(entry.action, platform)}</span>
						</Button>
					)}
				</div>
			</div>
		</li>
	);
}
