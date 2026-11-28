import { useState } from "react";
import { Captions, Languages, Mic, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TARGET_LANGUAGES, languageOf } from "@shared/languages";
import { autoKhmer, getSubtitles, setLanguage as setTargetLanguage, mainMedia, preferredSiteSubtitle, translateCues } from "@/lib/actions";
import { useEditor } from "@/state/store";
import { GlossarySection } from "./GlossarySection";
import { AppSelect, ProgressBar, Section, TaskProgress, useBusy } from "./common";

/** What the videos speak, for speech to text. */
export const LANGUAGES = [
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
	const target = languageOf(project.language);

	return (
		<>
			<Section
				title={`Auto ${target.name} subtitles`}
				hint={`Gets the original lines (from the site, or cloud speech-to-text), then translates them to ${target.name} (Gemini, Google Translate or Claude, set in Settings). Long movies take a minute or two.`}
				action={
					<Button variant="ghost" size="icon-xs" aria-label="API keys and models" onClick={() => useEditor.getState().openSettings("translation")}>
						<Settings />
					</Button>
				}
			>
				<div className="grid grid-cols-1 gap-2 @[28rem]:grid-cols-2">
					<div className="space-y-1.5">
						<p className="text-xs text-muted-foreground">Spoken language</p>
						<AppSelect label="Spoken language" value={language} options={LANGUAGES} onChange={setLanguage} />
					</div>
					<div className="space-y-1.5">
						<p className="text-xs text-muted-foreground">Translate to</p>
						<AppSelect label="Translate to" value={target.code} options={TARGET_LANGUAGES.map((l) => ({ value: l.code, label: l.code === l.native ? l.name : `${l.name} · ${l.native}` }))} onChange={setTargetLanguage} />
					</div>
				</div>
				<Button className="h-auto min-h-control w-full whitespace-normal py-2 leading-snug" disabled={!media || busy} onClick={() => void autoKhmer(language)}>
					<Zap /> Make {target.name} subtitles
				</Button>
				{!media && <p className="text-xs text-muted-foreground">Add a video to the timeline first.</p>}
				{media && site && <p className="text-xs text-muted-foreground">This video has the site's own subtitles, so speech-to-text is skipped.</p>}
				<TaskProgress prefix="asr" />
				<TaskProgress prefix="translate" />
			</Section>

			<Section title="Notes for the translator" hint="Names, who's who, the show's title, the tone. Gemini and Claude keep names and politeness consistent with them.">
				<Textarea
					className="min-h-24 text-xs"
					placeholder="e.g. Palace drama. 李明 is the hero, write it លី មីង. The emperor speaks formally."
					value={project.context}
					aria-label="Notes for the translator"
					onFocus={() => useEditor.getState().checkpoint()}
					onChange={(e) => update((p) => ({ ...p, context: e.target.value }), false)}
				/>
			</Section>

			<GlossarySection />

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
						<Button variant="outline" size="sm" className="h-auto min-h-control whitespace-normal py-1.5 leading-snug" disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "site", path: site })}>
							<Captions /> Use the site's subtitles
						</Button>
					)}
					<Button variant="outline" size="sm" className="h-auto min-h-control whitespace-normal py-1.5 leading-snug" disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "cloud", language })}>
						<Mic /> Speech to text (cloud)
					</Button>
					<div className="grid grid-cols-1 gap-1.5 @[17rem]:grid-cols-2">
						<Button variant="outline" size="sm" disabled={!total || busy} onClick={() => void translateCues(false)}>
							<Languages /> Translate all
						</Button>
						<Button variant="outline" size="sm" disabled={!total || busy || translated === total} onClick={() => void translateCues(true)}>
							<Languages /> Only missing
						</Button>
					</div>
				</div>
			</Section>
		</>
	);
}
