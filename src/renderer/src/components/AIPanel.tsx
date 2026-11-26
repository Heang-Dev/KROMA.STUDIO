import { useState } from "react";
import { Captions, Languages, Mic, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { autoKhmer, getSubtitles, mainMedia, preferredSiteSubtitle, translateCues } from "@/lib/actions";
import { useEditor } from "@/state/store";
import { AppSelect, ProgressBar, Section, TaskProgress, useBusy } from "./common";

const LANGUAGES = [
	{ value: "zh", label: "Chinese (Mandarin)" },
	{ value: "yue", label: "Cantonese" },
	{ value: "en", label: "English" },
	{ value: "ko", label: "Korean" },
	{ value: "ja", label: "Japanese" },
	{ value: "th", label: "Thai" },
	{ value: "vi", label: "Vietnamese" },
	{ value: "auto", label: "Detect automatically" },
];

export function AIPanel() {
	const project = useEditor((s) => s.project);
	const update = useEditor((s) => s.update);
	const [language, setLanguage] = useState("zh");
	const transcribing = useBusy("asr");
	const translating = useBusy("translate");
	const busy = transcribing || translating;
	const media = project.clips.length ? mainMedia() : null;
	const site = media ? preferredSiteSubtitle(media) : null;
	const total = project.cues.length;
	const translated = project.cues.filter((c) => c.text.trim()).length;

	return (
		<>
			<Section
				title="Auto Khmer subtitles"
				hint="Gets the Chinese lines (from the site, or cloud speech-to-text), then Claude translates them to Khmer. Long movies take a minute or two."
				action={
					<Button variant="ghost" size="icon-xs" aria-label="API keys and models" onClick={() => useEditor.getState().openSettings("translation")}>
						<Settings />
					</Button>
				}
			>
				<div className="space-y-1.5">
					<p className="text-xs text-muted-foreground">Spoken language</p>
					<AppSelect label="Spoken language" value={language} options={LANGUAGES} onChange={setLanguage} />
				</div>
				<Button className="h-auto min-h-9 w-full whitespace-normal py-2 leading-snug" disabled={!media || busy} onClick={() => void autoKhmer(language)}>
					<Zap /> Make Khmer subtitles
				</Button>
				{!media && <p className="text-xs text-muted-foreground">Add a video to the timeline first.</p>}
				{media && site && <p className="text-xs text-muted-foreground">This video has the site's own Chinese subtitles, so speech-to-text is skipped.</p>}
				<TaskProgress prefix="asr" />
				<TaskProgress prefix="translate" />
			</Section>

			<Section title="Notes for the translator" hint="Names, who's who, the show's title, the tone. Claude keeps names and politeness consistent with them.">
				<Textarea
					className="min-h-24 text-xs"
					placeholder="e.g. Palace drama. 李明 is the hero, write it លី មីង. The emperor speaks formally."
					value={project.context}
					aria-label="Notes for the translator"
					onFocus={() => useEditor.getState().checkpoint()}
					onChange={(e) => update((p) => ({ ...p, context: e.target.value }), false)}
				/>
			</Section>

			<Section title="Step by step" hint="Run one step at a time, or redo just one.">
				{total > 0 && (
					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Translated</span>
							<span className="tabular-nums">
								{translated} / {total}
							</span>
						</div>
						<ProgressBar value={translated / total} />
					</div>
				)}
				<div className="grid gap-1.5">
					{site && (
						<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "site", path: site })}>
							<Captions /> Use the site's subtitles
						</Button>
					)}
					<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "cloud", language })}>
						<Mic /> Speech to text (cloud)
					</Button>
					<div className="grid grid-cols-1 gap-1.5 @[19rem]:grid-cols-2">
						<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!total || busy} onClick={() => void translateCues(false)}>
							<Languages /> Translate all
						</Button>
						<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!total || busy || translated === total} onClick={() => void translateCues(true)}>
							Translate missing
						</Button>
					</div>
				</div>
			</Section>
		</>
	);
}
