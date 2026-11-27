import { Fragment, useCallback, useEffect, useState } from "react";
import { CircleCheck, Loader2, Mic, MoreHorizontal, Plus, Sparkles, Star, Trash2, Wand2 } from "lucide-react";
import { KVS_TEMPLATES, groupTemplates, type KvsStatus, type KvsVoice } from "@shared/types";
import { TARGET_LANGUAGES } from "@shared/languages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { forgetVoice, setVoice } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { CloneDialog } from "./VoicePanel";
import { WaveformPlayer } from "./WaveformPlayer";

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
							<Button size="sm" onClick={() => setCloneOpen(true)} disabled={status !== null && !status.online}>
								<Plus /> Clone voice
							</Button>
						</div>
					</div>

					<LibrarySection icon={<Mic className="size-4" />} title="Your voices" description="Voices you cloned. Only use voices you have permission to use.">
						{clones.length === 0 ? (
							<p className="col-span-full text-xs text-muted-foreground">No cloned voices yet. Clone one from a 5–20 second recording of your own voice (or someone who agreed).</p>
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

					<LibrarySection icon={<Star className="size-4" />} title="Preset voices" description="A voice for every kind of character. Each is a saved sample, so it sounds the same in every video.">
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
