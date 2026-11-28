import { useState } from "react";
import { Captions, Languages, Mic, Settings, Zap } from "lucide-react";
import { t } from "@shared/i18n";
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
	const targetName = t(target.name);

	return (
		<>
			<Section
				title={t("Auto {language} subtitles", { language: targetName })}
				hint={t("Gets the original lines (from the site, or cloud speech-to-text), then translates them to {language} (Gemini, Google Translate or Claude, set in Settings). Long movies take a minute or two.", { language: targetName })}
				action={
					<Button variant="ghost" size="icon-xs" aria-label={t("API keys and models")} onClick={() => useEditor.getState().openSettings("translation")}>
						<Settings />
					</Button>
				}
			>
				<div className="grid grid-cols-1 gap-2 @[28rem]:grid-cols-2">
					<div className="space-y-1.5">
						<p className="text-xs text-muted-foreground">{t("Spoken language")}</p>
						<AppSelect label={t("Spoken language")} value={language} options={LANGUAGES.map((l) => ({ ...l, label: t(l.label) }))} onChange={setLanguage} />
					</div>
					<div className="space-y-1.5">
						<p className="text-xs text-muted-foreground">{t("Translate to")}</p>
						<AppSelect label={t("Translate to")} value={target.code} options={TARGET_LANGUAGES.map((l) => ({ value: l.code, label: l.code === l.native || (t(l.name) !== l.name && t(l.name) === l.native) ? t(l.name) : `${t(l.name)} · ${l.native}` }))} onChange={setTargetLanguage} />
					</div>
				</div>
				<Button className="h-auto min-h-control w-full whitespace-normal py-2 leading-snug" disabled={!media || busy} onClick={() => void autoKhmer(language)}>
					<Zap /> {t("Make {language} subtitles", { language: targetName })}
				</Button>
				{!media && <p className="text-xs text-muted-foreground">{t("Add a video to the timeline first.")}</p>}
				{media && site && <p className="text-xs text-muted-foreground">{t("This video has the site's own subtitles, so speech-to-text is skipped.")}</p>}
				<TaskProgress prefix="asr" />
				<TaskProgress prefix="translate" />
			</Section>

			<Section title={t("Notes for the translator")} hint={t("Names, who's who, the show's title, the tone. Gemini and Claude keep names and politeness consistent with them.")}>
				<Textarea
					className="min-h-24 text-xs"
					placeholder={t("e.g. Palace drama. 李明 is the hero, write it លី មីង. The emperor speaks formally.")}
					value={project.context}
					aria-label={t("Notes for the translator")}
					onFocus={() => useEditor.getState().checkpoint()}
					onChange={(e) => update((p) => ({ ...p, context: e.target.value }), false)}
				/>
			</Section>

			<GlossarySection />

			<Section title={t("Step by step")} hint={t("Run one step at a time, or redo just one.")}>
				{total > 0 && (
					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">{t("Translated")}</span>
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
							<Captions /> {t("Use the site's subtitles")}
						</Button>
					)}
					<Button variant="outline" size="sm" className="h-auto min-h-control whitespace-normal py-1.5 leading-snug" disabled={!media || busy} onClick={() => media && void getSubtitles(media, { kind: "cloud", language })}>
						<Mic /> {t("Speech to text (cloud)")}
					</Button>
					<div className="grid grid-cols-1 gap-1.5 @[17rem]:grid-cols-2">
						<Button variant="outline" size="sm" disabled={!total || busy} onClick={() => void translateCues(false)}>
							<Languages /> {t("Translate all")}
						</Button>
						<Button variant="outline" size="sm" disabled={!total || busy || translated === total} onClick={() => void translateCues(true)}>
							<Languages /> {t("Only missing")}
						</Button>
					</div>
				</div>
			</Section>
		</>
	);
}
