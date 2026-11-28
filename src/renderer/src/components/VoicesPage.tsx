import { Fragment, useCallback, useEffect, useState } from "react";
import { CircleCheck, Library, Loader2, Mic, Power, Search, MoreHorizontal, Plus, Sparkles, Star, Trash2, Wand2 } from "lucide-react";
import { KVS_TEMPLATES, groupTemplates, type KvsStatus, type KvsVoice } from "@shared/types";
import { TARGET_LANGUAGES } from "@shared/languages";
import { t } from "@shared/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { forgetVoice, setVoice } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { CloneDialog } from "./VoicePanel";
import { WaveformPlayer } from "./WaveformPlayer";
import { EngineChip } from "./EngineStatus";
import { PageHeader, PageSection } from "./PageHeader";
import { Segmented } from "./common";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty/EmptyState";

// The voice library: your cloned voices, the template (preset)
// voices with their samples, and the instant voices, each a card with a waveform player.

export function VoicesPage() {
	const [voices, setVoices] = useState<KvsVoice[]>([]);
	const [status, setStatus] = useState<KvsStatus | null>(null);
	const [cloneOpen, setCloneOpen] = useState(false);
	const refresh = useCallback(() => {
		void window.kroma.kvsVoices().then(setVoices);
		void window.kroma.kvsStatus().then(setStatus);
	}, []);
	useEffect(refresh, [refresh]);

	const [show, setShow] = useState<"all" | "yours" | "presets" | "instant">("all");
	const [query, setQuery] = useState("");
	const q = query.trim().toLowerCase();
	const matches = (...text: (string | undefined)[]) => !q || text.some((x) => x?.toLowerCase().includes(q));

	const clones = voices.filter((v) => !v.preset && matches(v.name, v.transcript));
	const allTemplates = status?.presets.length ? status.presets : KVS_TEMPLATES;
	const templates = allTemplates.filter((tpl) => matches(tpl.name, tpl.description));
	const instant = TARGET_LANGUAGES.map((lang) => ({ ...lang, voices: lang.voices.filter((v) => matches(v.label, lang.name, lang.native)) })).filter((lang) => lang.voices.length);
	const instantCount = instant.reduce((n, l) => n + l.voices.length, 0);
	const engineReady = Boolean(status?.online);
	const use = (voice: string, label: string) => {
		setVoice({ voice, enabled: true });
		useEditor.getState().showToast(t("\"{name}\" is the voice for this project", { name: label }));
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<PageHeader
				icon={<Library />}
				title={t("Voices")}
				description={t("Every voice Kroma can speak with. Press ▶ to listen; ⋯ → Use in this project.")}
				actions={
					<>
						<EngineChip />
						<Button size="sm" onClick={() => setCloneOpen(true)} disabled={!engineReady} title={engineReady ? undefined : t("Cloning needs the voice engine: start it first")}>
							<Plus /> {t("Clone voice")}
						</Button>
					</>
				}
			/>
			<div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2">
				<Segmented
					label={t("Show")}
					value={show}
					onChange={setShow}
					options={[
						{ value: "all", label: t("All") },
						{ value: "yours", label: `${t("Yours")} · ${clones.length}` },
						{ value: "presets", label: `${t("Presets")} · ${templates.length}` },
						{ value: "instant", label: `${t("Instant")} · ${instantCount}` },
					]}
				/>
				<div className="relative w-64 max-w-full">
					<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input aria-label={t("Find a voice")} placeholder={t("Find a voice")} className="pl-8 text-xs" value={query} onChange={(e) => setQuery(e.target.value)} />
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto w-full max-w-[1600px] space-y-8 px-6 pt-5 pb-24">
					{!engineReady && status !== null && (
						<div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/50 px-3.5 py-3 text-xs">
							<span className="leading-relaxed text-muted-foreground">
								<span className="font-medium text-foreground">{t("Your voices and the presets need the voice engine.")}</span> {t("Instant voices work without it.")}
							</span>
							<Button variant="outline" size="sm" onClick={() => useEditor.getState().openSettings("voice-engine")}>
								<Power /> {status.local && status.installed === "missing" ? t("Install the voice engine") : t("Voice engine settings")}
							</Button>
						</div>
					)}
					{(show === "all" || show === "yours") && (
					<LibrarySection icon={<Mic className="size-4" />} title={t("Your voices")} description={t("Voices you cloned. Only use voices you have permission to use.")}>
						{clones.length === 0 ? (
							<EmptyState compact fill={false} className="col-span-full rounded-lg border border-dashed" scene={q ? "search" : "voice"} title={q ? t("None of your voices match") : t("No cloned voices yet")} description={q ? t("Try another word, or clear the search.") : t("Record 5–20 seconds of your own voice, or of someone who agreed, and Kroma can speak in it.")} action={q ? undefined : <Button variant="outline" size="sm" onClick={() => setCloneOpen(true)}><Plus /> {t("Clone voice")}</Button>} />
						) : (
							clones.map((v) => (
								<VoiceCard
									key={v.id}
									icon={<Mic className="size-3.5" />}
									title={v.name}
									meta={`${v.seconds.toFixed(1)} s · ${t("cloned")}`}
									transcript={v.transcript}
									player={<WaveformPlayer path={v.path} />}
									onUse={() => use(`kvs-clone:${v.id}`, v.name)}
									onDelete={() => {
										if (!window.confirm(t("Delete the voice \"{name}\"?", { name: v.name }))) return;
										void window.kroma.kvsDelete(v.id).then(() => {
											forgetVoice(`kvs-clone:${v.id}`);
											refresh();
										});
									}}
								/>
							))
						)}
					</LibrarySection>
					)}

					{(show === "all" || show === "presets") && templates.length > 0 && (
					<LibrarySection icon={<Star className="size-4" />} title={t("Preset voices")} description={t("A voice for every kind of character. Each is a saved sample, so it sounds the same in every video.")}>
						{groupTemplates(templates).map((g) => (
							<Fragment key={g.title}>
								<h3 className="col-span-full mt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:mt-0">{t(g.title)}</h3>
								{g.items.map((tpl) => {
									const saved = voices.find((v) => v.preset === tpl.name);
									return (
										<VoiceCard
											key={tpl.name}
											icon={<Star className="size-3.5" />}
											title={tpl.name}
											meta={saved ? `${saved.seconds.toFixed(1)} s` : t("no sample yet")}
											ready={Boolean(saved)}
											transcript={saved?.transcript ?? tpl.description}
											player={saved ? <WaveformPlayer path={saved.path} /> : <MakeSampleButton name={tpl.name} offline={!status?.online} onMade={refresh} />}
											onUse={() => use(`kvs-design:${tpl.name}`, tpl.name)}
											onDelete={saved ? () => void window.kroma.kvsDelete(saved.id).then(refresh) : undefined}
											deleteLabel={t("Delete the sample")}
										/>
									);
								})}
							</Fragment>
						))}
					</LibrarySection>
					)}

					{(show === "all" || show === "instant") && instant.length > 0 && (
					<LibrarySection icon={<Sparkles className="size-4" />} title={t("Instant voices")} description={t("Microsoft's free voices, ready in seconds. Khmer's are good for drafts; for other languages they're the voice-over.")}>
						{instant.map((lang) => (
							<Fragment key={lang.code}>
								<h3 className="col-span-full mt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:mt-0">
									{t(lang.name)} · {lang.native}
								</h3>
								{lang.voices.map((v) => (
									<VoiceCard
										key={v.id}
										icon={<Sparkles className="size-3.5" />}
										title={v.label}
										meta={`${t("instant")} · ${t(lang.name)}`}
										ready
										transcript={lang.sample}
										player={<WaveformPlayer resolve={() => window.kroma.voiceSample(v.id, 0)} />}
										onUse={() => use(v.id, v.label)}
									/>
								))}
							</Fragment>
						))}
					</LibrarySection>
					)}
					{q && !clones.length && !templates.length && !instant.length && <p className="py-10 text-center text-xs text-muted-foreground">{t("No voice matches \"{query}\".", { query })}</p>}
				</div>
			</div>
			<CloneDialog open={cloneOpen} onOpenChange={setCloneOpen} onCloned={refresh} />
		</div>
	);
}

function LibrarySection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
	return (
		<PageSection icon={icon} title={title} description={description}>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>
		</PageSection>
	);
}

function VoiceCard({
	icon,
	title,
	meta,
	ready = true,
	transcript,
	player,
	onUse,
	onDelete,
	deleteLabel,
}: {
	icon: React.ReactNode;
	title: string;
	meta: string;
	ready?: boolean;
	transcript?: string;
	player: React.ReactNode;
	onUse: () => void;
	onDelete?: () => void;
	deleteLabel?: string;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-3.5">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="flex items-center gap-1.5 text-[13px] font-medium">
						{icon} <span className="truncate">{title}</span>
					</p>
					<p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					{ready && (
						<Badge variant="outline" className="gap-1 border-success/40 text-[10px] text-success">
							<CircleCheck className="size-3" /> {t("Ready")}
						</Badge>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-xs" aria-label={t("More for {name}", { name: title })}>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onUse}>{t("Use in this project")}</DropdownMenuItem>
							{onDelete && (
								<DropdownMenuItem variant="destructive" onClick={onDelete}>
									<Trash2 /> {deleteLabel ?? t("Delete")}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			{player}
			{transcript && (
				<p lang="km" className="line-clamp-3 text-xs leading-relaxed text-muted-foreground select-text">
					{transcript}
				</p>
			)}
		</div>
	);
}

function MakeSampleButton({ name, offline, onMade }: { name: string; offline: boolean; onMade: () => void }) {
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="outline"
			size="sm"
			className="w-full"
			disabled={busy || offline}
			title={offline ? t("Start the voice engine to make samples") : undefined}
			onClick={async () => {
				setBusy(true);
				const made = await runTask(`preset-${Date.now()}`, t("Make \"{name}\" sample", { name }), (id) => window.kroma.makePresetVoice(id, name), {
					kind: "voices",
					done: () => ({ tone: "success", title: t("\"{name}\" sample is ready", { name }), action: { kind: "view", view: "voices" } }),
					failed: t("Couldn't make the \"{name}\" sample", { name }),
				});
				setBusy(false);
				if (made) onMade();
			}}
		>
			{busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? t("Making the sample…") : offline ? t("Start the engine to make a sample") : t("Make a sample (once)")}
		</Button>
	);
}
