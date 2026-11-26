import { useState } from "react";
import { Lightning, Microphone, Subtitles, Translate } from "@phosphor-icons/react";
import { autoKhmer, getSubtitles, mainMedia, preferredSiteSubtitle, translateCues } from "@/lib/actions";
import { useEditor } from "@/state/store";
import { Button, Label, Section, TaskProgress, inputClass, useBusy } from "./ui";

const LANGUAGES = [
	{ code: "zh", label: "Chinese (Mandarin)" },
	{ code: "yue", label: "Cantonese" },
	{ code: "en", label: "English" },
	{ code: "ko", label: "Korean" },
	{ code: "ja", label: "Japanese" },
	{ code: "th", label: "Thai" },
	{ code: "vi", label: "Vietnamese" },
	{ code: "auto", label: "Detect automatically" },
];

export function AIPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
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
			<Section title="Auto Khmer subtitles" hint="One click: gets the Chinese lines (from the site, or speech-to-text in the cloud), then translates them to Khmer with Claude. Long movies take about a minute or two.">
				<Label>Spoken language</Label>
				<select className={`${inputClass} mb-3`} value={language} onChange={(e) => setLanguage(e.target.value)}>
					{LANGUAGES.map((l) => (
						<option key={l.code} value={l.code}>{l.label}</option>
					))}
				</select>
				<Button variant="primary" className="h-10 w-full text-sm" disabled={!media || busy} onClick={() => void autoKhmer(language)}>
					<Lightning size={17} weight="fill" /> Make Khmer subtitles
				</Button>
				{!media && <p className="mt-2 text-xs text-dim">Add a video to the timeline first.</p>}
				{media && site && <p className="mt-2 text-xs text-muted">This video has the site's own Chinese subtitles, so speech-to-text is skipped.</p>}
				<TaskProgress prefix="asr" />
				<TaskProgress prefix="translate" />
				<button type="button" className="mt-3 text-xs text-dim underline-offset-2 hover:text-muted hover:underline" onClick={onOpenSettings}>
					API keys and models
				</button>
			</Section>

			<Section title="Notes for the translator" hint="Names, who's who, the show's title, the tone. Claude uses them to keep names and politeness consistent.">
				<textarea
					className={`${inputClass} h-24 resize-none py-2 leading-relaxed`}
					placeholder="e.g. Palace drama. 李明 is the hero, write it លី មីង. The emperor speaks formally."
					value={project.context}
					onFocus={() => useEditor.getState().checkpoint()}
					onChange={(e) => update((p) => ({ ...p, context: e.target.value }), false)}
				/>
			</Section>

			<Section title="Step by step" hint={total ? `${total} lines · ${translated} translated` : "Run one step at a time, or redo just one."}>
				<div className="grid gap-2">
					{site && (
						<Button disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "site", path: site })}>
							<Subtitles size={15} /> Use the site's subtitles
						</Button>
					)}
					<Button disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "cloud", language })}>
						<Microphone size={15} /> Speech to text (cloud)
					</Button>
					<div className="grid grid-cols-2 gap-2">
						<Button disabled={!total || busy} onClick={() => void translateCues(false)}>
							<Translate size={15} /> Translate all
						</Button>
						<Button disabled={!total || busy || translated === total} onClick={() => void translateCues(true)}>
							Translate missing
						</Button>
					</div>
				</div>
			</Section>
		</>
	);
}
