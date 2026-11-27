import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import type { SettingsView } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { SETTINGS_SECTIONS, type SettingsPatch } from "./sections";
import { refreshEngineStatus } from "../EngineStatus";
import { EmptyState } from "@/components/empty/EmptyState";

// Full-page settings in Orca's layout: nav (back, search, grouped pages) on the left, a breadcrumb header and a
// centred column of cards on the right. Changes save as you make them.

export function SettingsPage() {
	const view = useEditor((s) => s.view);
	const active = view.name === "settings" ? view.section : SETTINGS_SECTIONS[0].id;
	const [settings, setSettings] = useState<SettingsView | null>(null);
	const [query, setQuery] = useState("");
	const [version, setVersion] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		void window.kroma.getSettings().then(setSettings);
		void window.kroma.info().then((info) => setVersion(info.version));
		// ⌘+ / ⌘− change the size from the menu; keep the Appearance control in step.
		return window.kroma.onZoomChanged(() => void window.kroma.getSettings().then(setSettings));
	}, []);

	// ⌘F focuses the search, Escape goes back to the editor (Orca's keys).
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
				e.preventDefault();
				searchRef.current?.focus();
			} else if (e.key === "Escape" && !document.querySelector("[data-radix-popper-content-wrapper]")) {
				if (document.activeElement === searchRef.current && query) setQuery("");
				else useEditor.getState().closeSettings();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [query]);

	const save = async (patch: SettingsPatch) => {
		setSettings(await window.kroma.saveSettings(patch));
		void refreshEngineStatus();
	};

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		return q ? SETTINGS_SECTIONS.filter((s) => `${s.title} ${s.group} ${s.keywords}`.toLowerCase().includes(q)) : SETTINGS_SECTIONS;
	}, [query]);
	const groups = [...new Set(visible.map((s) => s.group))];
	const section = SETTINGS_SECTIONS.find((s) => s.id === active) ?? SETTINGS_SECTIONS[0];
	const Section = section.component;
	const open = (id: string) => useEditor.getState().openSettings(id);

	return (
		<div className="flex min-h-0 flex-1 overflow-hidden bg-background">
			<aside className="flex w-[240px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
				<div className="flex h-12 shrink-0 items-center border-b px-3">
					<Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[13px] font-normal text-muted-foreground" onClick={() => useEditor.getState().closeSettings()}>
						<ArrowLeft /> Back to app
					</Button>
				</div>
				<div className="border-b px-3 py-3">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							ref={searchRef}
							className="bg-background/60 pr-14 pl-8 text-[13px]"
							placeholder="Search settings"
							aria-label="Search settings"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && visible[0] && open(visible[0].id)}
						/>
						<span className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 gap-0.5">
							<Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
							<Kbd>F</Kbd>
						</span>
					</div>
				</div>
				<nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Settings">
					{groups.map((group) => (
						<div key={group} className="space-y-1">
							<p className="px-2.5 pb-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">{group}</p>
							{visible
								.filter((s) => s.group === group)
								.map((s) => {
									const Icon = s.icon;
									const isActive = s.id === active;
									return (
										<button
											key={s.id}
											type="button"
											aria-current={isActive ? "page" : undefined}
											onClick={() => open(s.id)}
											className={cn(
												"flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
												isActive ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-sidebar-foreground",
											)}
										>
											<Icon className="size-4 shrink-0" />
											<span className="truncate">{s.title}</span>
										</button>
									);
								})}
						</div>
					))}
					{visible.length === 0 && <EmptyState compact fill={false} scene="search" title="No settings match" description={`Nothing called "${query}". Try another word.`} />}
				</nav>
				{/* The running version, so it's always clear which Kroma this is. */}
				<div className="flex h-10 shrink-0 items-center gap-2 border-t px-5 text-[11px] text-muted-foreground">
					<span>Kroma</span>
					{version && <span className="font-mono">v{version}</span>}
				</div>
			</aside>

			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b px-5 text-[13px]">
					<span className="text-muted-foreground">Settings</span>
					<span className="text-muted-foreground">/</span>
					<span aria-current="page">{section.title}</span>
					<Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close settings" onClick={() => useEditor.getState().closeSettings()}>
						<X />
					</Button>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
					<div className="mx-auto flex w-full max-w-[820px] flex-col gap-7 px-8 pt-6 pb-24">{settings && <Section settings={settings} save={save} />}</div>
				</div>
			</div>
		</div>
	);
}
