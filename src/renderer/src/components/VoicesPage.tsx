import { Fragment, useCallback, useEffect, useState } from "react";
import { CircleCheck, Download, Loader2, Mic, MoreHorizontal, Plus, Sparkles, Star, Trash2, Wand2 } from "lucide-react";
import { KVS_TEMPLATES, groupTemplates, type KvsStatus, type KvsVoice } from "@shared/types";
import { TARGET_LANGUAGES } from "@shared/languages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { forgetVoice, setVoice } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { CloneDialog } from "./VoicePanel";
import { WaveformPlayer } from "./WaveformPlayer";

// The voice library, laid out like Khmer Voice Studio's "My voices": your cloned voices, the template (preset)
// voices with their samples, and the instant voices, each a card with a waveform player.

export function VoicesPage() {
	const [voices, setVoices] = useState<KvsVoice[]>([]);
	const [status, setStatus] = useState<KvsStatus | null>(null);
	const [cloneOpen, setCloneOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [waiting, setWaiting] = useState<string[]>([]);
	const refresh = useCallback(() => {
		void window.kroma.kvsVoices().then(setVoices);
		void window.kroma.kvsStatus().then(setStatus);
		// Your cloned voices still in KVS only (each needs your consent to bring over).
		void window.kroma
			.kvsImportable()
			.then((list) => setWaiting(list.filter((v) => v.kind === "clone" && !v.imported).map((v) => v.name)))
			.catch(() => setWaiting([]));
	}, []);
	useEffect(refresh, [refresh]);

	const clones = voices.filter((v) => !v.preset);
	const templates = status?.presets.length ? status.presets : KVS_TEMPLATES;
	const use = (voice: string, label: string) => {
		setVoice({ voice, enabled: true });
		useEditor.getState().showToast(`"${label}" is the voice for this project`);
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto w-full max-w-[1600px] space-y-6 px-8 pt-6 pb-24">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h1 className="text-xl font-semibold">My voices</h1>
							<p className="mt-1 text-xs text-muted-foreground">Clone a voice from a 5–20 second recording, use a voice template, or an instant voice. Press ▶ to listen.</p>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
								<Download /> Import from KVS
							</Button>
							<Button size="sm" onClick={() => setCloneOpen(true)} disabled={status !== null && !status.online}>
								<Plus /> Clone voice
							</Button>
						</div>
					</div>

					<LibrarySection icon={<Mic className="size-4" />} title="Your voices" description="Voices you cloned or imported. Only use voices you have permission to use.">
						{waiting.length > 0 && (
							<div className="col-span-full flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs">
								<span>
									In Khmer Voice Studio, not here yet: <span className="font-medium">{waiting.join(", ")}</span>
								</span>
								<Button variant="outline" size="xs" onClick={() => setImportOpen(true)}>
									<Download /> Import
								</Button>
							</div>
						)}
						{clones.length === 0 ? (
							<p className="col-span-full text-xs text-muted-foreground">No cloned voices yet. Clone one, or import your voices from Khmer Voice Studio.</p>
						) : (
							clones.map((v) => (
								<VoiceCard
									key={v.id}
									icon={<Mic className="size-3.5" />}
									title={v.name}
									meta={`${v.seconds.toFixed(1)} s · cloned`}
									transcript={v.transcript}
									player={<WaveformPlayer path={v.path} />}
									onUse={() => use(`kvs-clone:${v.id}`, v.name)}
									onDelete={() => {
										if (!window.confirm(`Delete the voice "${v.name}"?`)) return;
										void window.kroma.kvsDelete(v.id).then(() => {
											forgetVoice(`kvs-clone:${v.id}`);
											refresh();
										});
									}}
								/>
							))
						)}
					</LibrarySection>

					<LibrarySection icon={<Star className="size-4" />} title="Preset voices" description="The same voices as Khmer Voice Studio, for every kind of character. Each is a saved sample, so it sounds the same in every video.">
						{groupTemplates(templates).map((g) => (
							<Fragment key={g.title}>
								<h3 className="col-span-full mt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:mt-0">{g.title}</h3>
								{g.items.map((t) => {
									const saved = voices.find((v) => v.preset === t.name);
									return (
										<VoiceCard
											key={t.name}
											icon={<Star className="size-3.5" />}
											title={t.name}
											meta={saved ? `${saved.seconds.toFixed(1)} s` : "no sample yet"}
											ready={Boolean(saved)}
											transcript={saved?.transcript ?? t.description}
											player={saved ? <WaveformPlayer path={saved.path} /> : <MakeSampleButton name={t.name} offline={!status?.online} onMade={refresh} />}
											onUse={() => use(`kvs-design:${t.name}`, t.name)}
											onDelete={saved ? () => void window.kroma.kvsDelete(saved.id).then(refresh) : undefined}
											deleteLabel="Delete the sample"
										/>
									);
								})}
							</Fragment>
						))}
					</LibrarySection>

					<LibrarySection icon={<Sparkles className="size-4" />} title="Instant voices" description="Microsoft's free voices, ready in seconds. Khmer's are good for drafts; for other languages they're the voice-over.">
						{TARGET_LANGUAGES.map((lang) => (
							<Fragment key={lang.code}>
								<h3 className="col-span-full mt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:mt-0">
									{lang.name} · {lang.native}
								</h3>
								{lang.voices.map((v) => (
									<VoiceCard
										key={v.id}
										icon={<Sparkles className="size-3.5" />}
										title={v.label}
										meta={`instant · ${lang.name}`}
										ready
										transcript={lang.sample}
										player={<WaveformPlayer resolve={() => window.kroma.voiceSample(v.id, 0)} />}
										onUse={() => use(v.id, v.label)}
									/>
								))}
							</Fragment>
						))}
					</LibrarySection>
				</div>
			</div>
			<CloneDialog open={cloneOpen} onOpenChange={setCloneOpen} onCloned={refresh} />
			<ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
		</div>
	);
}

function LibrarySection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
	return (
		<section className="rounded-lg border bg-card/30 p-4">
			<div className="mb-3">
				<h2 className="flex items-center gap-2 text-sm font-semibold">
					{icon} {title}
				</h2>
				<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
			</div>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>
		</section>
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
	deleteLabel = "Delete",
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
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
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
							<CircleCheck className="size-3" /> Ready
						</Badge>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-xs" aria-label={`More for ${title}`}>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onUse}>Use in this project</DropdownMenuItem>
							{onDelete && (
								<DropdownMenuItem variant="destructive" onClick={onDelete}>
									<Trash2 /> {deleteLabel}
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
			title={offline ? "Start the voice engine to make samples" : undefined}
			onClick={async () => {
				setBusy(true);
				const made = await runTask(`preset-${Date.now()}`, `Make "${name}" sample`, (id) => window.kroma.makePresetVoice(id, name));
				setBusy(false);
				if (made) onMade();
			}}
		>
			{busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? "Making the sample…" : offline ? "Start the engine to make a sample" : "Make a sample (once)"}
		</Button>
	);
}

/** Brings voices over from the Khmer Voice Studio dashboard. Presets come freely; each clone needs your consent. */
function ImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void }) {
	const [list, setList] = useState<Awaited<ReturnType<typeof window.kroma.kvsImportable>> | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [chosen, setChosen] = useState<number[]>([]);
	const [consent, setConsent] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!open) return;
		setList(null);
		setError(null);
		setConsent(false);
		window.kroma
			.kvsImportable()
			.then((l) => {
				setList(l);
				setChosen(l.filter((v) => v.kind === "preset" && !v.imported).map((v) => v.kvsId));
				l.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "clone" ? -1 : 1));
			})
			.catch((e: Error) => setError(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")));
	}, [open]);

	const clonesChosen = list?.some((v) => v.kind === "clone" && chosen.includes(v.kvsId)) ?? false;
	const toggle = (id: number, on: boolean) => setChosen((c) => (on ? [...c, id] : c.filter((x) => x !== id)));

	return (
		<Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Import from Khmer Voice Studio</DialogTitle>
					<DialogDescription>Copies voices from your KVS dashboard into Kroma. Preset voices come over by themselves; tick the cloned voices you want.</DialogDescription>
				</DialogHeader>
				{error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
				{!list && !error && (
					<p className="flex items-center gap-2 text-xs text-muted-foreground">
						<Loader2 className="size-3.5 animate-spin" /> Reading KVS…
					</p>
				)}
				{list && (
					<div className="divide-y rounded-lg border">
						{list.map((v) => (
							<label key={v.kvsId} className="flex items-center gap-3 px-3 py-2 text-xs">
								<Checkbox checked={v.imported || chosen.includes(v.kvsId)} disabled={v.imported} onCheckedChange={(on) => toggle(v.kvsId, on === true)} />
								<span className="min-w-0 flex-1">
									<span className="block truncate text-[13px] font-medium">{v.name}</span>
									<span className="text-muted-foreground">
										{v.kind === "preset" ? "Preset" : "Cloned voice"} · {v.seconds.toFixed(1)} s{v.imported ? " · already in Kroma" : ""}
									</span>
								</span>
							</label>
						))}
					</div>
				)}
				{clonesChosen && (
					<label className="flex items-start gap-2.5 text-xs leading-relaxed">
						<Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
						<span>Each cloned voice I'm importing is my own, or I have that person's permission to use it. I won't use a voice to pretend to be someone, including singers or other public figures.</span>
					</label>
				)}
				<DialogFooter>
					<Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						disabled={busy || !list || chosen.length === 0 || (clonesChosen && !consent)}
						onClick={async () => {
							setBusy(true);
							const n = await window.kroma.kvsImport(chosen).finally(() => setBusy(false));
							useEditor.getState().showToast(`Imported ${n} voice${n === 1 ? "" : "s"} from KVS`);
							onImported();
							onOpenChange(false);
						}}
					>
						{busy ? <Loader2 className="animate-spin" /> : <Download />} Import {chosen.length || ""}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
