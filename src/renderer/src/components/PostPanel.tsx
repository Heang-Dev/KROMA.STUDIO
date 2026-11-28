import { useEffect, useState } from "react";
import { Check, CircleCheck, CircleX, Copy, ExternalLink, FileDown, Loader2, Send, Settings, WandSparkles } from "lucide-react";
import { DEFAULT_PLATFORM_FORMAT, POST_FORMATS, type PostFormat, currentExport, neededFormats } from "@shared/batch";
import type { ExportQuality, PlatformCaption, PostProfile, Project, PublishPlatform } from "@shared/types";
import { languageOf } from "@shared/languages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_NAMES, exportSrt, publishVideo, updatePost, videoFingerprint, writePosts } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { Card, Row, Section, Segmented, TaskProgress, useBusy } from "./common";
import { CoverSection } from "./CoverSection";
import { t } from "@shared/i18n";

// Post: the AI writes each platform's title, text and hashtags (kept in the project, editable), then one click
// exports the video in each platform's format (YouTube 16:9, Facebook and TikTok 9:16 unless you choose otherwise) and
// posts it to YouTube, Facebook and TikTok through Upload-Post (Settings → Posting).

export const ORDER: { id: PublishPlatform; caption: PlatformCaption["platform"] }[] = [
	{ id: "youtube", caption: "YouTube" },
	{ id: "facebook", caption: "Facebook" },
	{ id: "tiktok", caption: "TikTok" },
];

/** The platforms with a working connection on the profile. */
export const connectedPlatforms = (profile: PostProfile | null): PublishPlatform[] => ORDER.map((o) => o.id).filter((id) => profile?.accounts[id] && !profile.accounts[id]?.needsReconnect);

/** Whether posting is set up (Settings → Posting) and which accounts are connected, refreshed when the window comes back into focus. */
export function usePostProfile(): { hasKey: boolean | null; profile: PostProfile | null } {
	const [hasKey, setHasKey] = useState<boolean | null>(null);
	const [profile, setProfile] = useState<PostProfile | null>(null);
	useEffect(() => {
		const load = () =>
			void window.kroma.getSettings().then((s) => {
				setHasKey(s.hasPostKey);
				if (!s.hasPostKey) return;
				void window.kroma
					.postProfiles()
					.then((list) => setProfile(list.find((x) => x.username === s.postProfile) ?? list[0] ?? null))
					.catch(() => setProfile(null));
			});
		load();
		window.addEventListener("focus", load);
		return () => window.removeEventListener("focus", load);
	}, []);
	return { hasKey, profile };
}

export function PostPanel() {
	const project = useEditor((s) => s.project);
	const writing = useBusy("captions");
	const posting = useBusy("publish");
	const exporting = useBusy("export");
	const lang = languageOf(project.language);
	const langName = t(lang.name);
	const translated = project.cues.filter((c) => c.text.trim());
	const posts = project.posts ?? [];

	const { hasKey, profile } = usePostProfile();
	const [chosen, setChosen] = useState<PublishPlatform[] | null>(null);
	const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private">("public");
	const [tiktokMode, setTiktokMode] = useState<"post" | "draft">("post");
	const [quality, setQuality] = useState<ExportQuality>("standard");
	const [formats, setFormats] = useState<Record<PublishPlatform, PostFormat>>(DEFAULT_PLATFORM_FORMAT);
	// Every connected account is ticked to start with.
	useEffect(() => {
		if (profile) setChosen((c) => c ?? connectedPlatforms(profile));
	}, [profile]);

	const selected = (chosen ?? []).filter((id) => profile?.accounts[id]);
	const needed = neededFormats({ platforms: selected, formats });
	const toExport = needed.filter((f) => !isExported(project, f));
	const reuse = needed.length > 0 && toExport.length === 0;
	const busy = posting || exporting;

	return (
		<>
			<Section
				title={t("1 · Posts")}
				hint={t("The AI reads the {language} subtitles and writes a title, text and hashtags for each platform. Edit anything before posting; it's saved with the project.", { language: langName })}
			>
				<Button variant={posts.length ? "outline" : "default"} className="h-auto min-h-control w-full whitespace-normal py-2 leading-snug" disabled={!translated.length || writing} onClick={() => void writePosts()}>
					{writing ? <Loader2 className="animate-spin" /> : <WandSparkles />} {posts.length ? t("Write them again") : t("Write the posts")}
				</Button>
				{!translated.length && <p className="text-xs text-muted-foreground">{t("Make the {language} subtitles first.", { language: langName })}</p>}
				<TaskProgress prefix="captions" />
				{ORDER.map(({ caption }) => {
					const post = posts.find((p) => p.platform === caption);
					return post ? <PostEditor key={caption} post={post} /> : null;
				})}
			</Section>

			<Section title={t("2 · Post to")} hint={t("Each platform gets its own format (YouTube 16:9, Facebook and TikTok 9:16 to start with). Exports what's needed and posts everywhere you tick, in one go.")}>
				{hasKey === false && (
					<div className="rounded-lg border border-dashed p-3 text-xs leading-relaxed">
						<p className="mb-2">{t("Connect YouTube, Facebook and TikTok once, and posting is one click from here.")}</p>
						<Button size="sm" onClick={() => useEditor.getState().openSettings("posting")}>
							<Settings /> {t("Connect accounts")}
						</Button>
					</div>
				)}
				{
					<>
						<Card className="px-0">
							{ORDER.map(({ id }) => {
								const account = profile?.accounts[id];
								const on = selected.includes(id);
								return (
									<div key={id} className="flex items-center gap-3 px-3 py-2.5">
										<Checkbox
											id={`post-${id}`}
											checked={on}
											disabled={!account || busy}
											onCheckedChange={(v) => setChosen((c) => (v === true ? [...(c ?? []), id] : (c ?? []).filter((x) => x !== id)))}
										/>
										<label htmlFor={`post-${id}`} className={cn("min-w-0 flex-1", !account && "opacity-60")}>
											<span className="block text-[13px] font-medium">{PLATFORM_NAMES[id]}</span>
											<span className="block truncate text-[11px] text-muted-foreground">
												{account ? `${account.name}${account.needsReconnect ? t(" · sign-in expired") : ""}` : profile || hasKey === false ? t("Not connected") : t("Checking…")}
											</span>
										</label>
										{/* The format shows before an account is connected too: it's what that platform will get. */}
										<FormatPicker platform={id} value={formats[id]} disabled={busy} onChange={(f) => setFormats((all) => ({ ...all, [id]: f }))} />
									</div>
								);
							})}
						</Card>
						<Card>
							{selected.includes("youtube") && (
								<Row
									stack
									label="YouTube"
									control={
										<Segmented
											equalWidth
											label={t("YouTube visibility")}
											size="sm"
											value={privacy}
											options={[
												{ value: "public", label: t("Public") },
												{ value: "unlisted", label: t("Unlisted") },
												{ value: "private", label: t("Private") },
											]}
											onChange={setPrivacy}
										/>
									}
								/>
							)}
							{selected.includes("tiktok") && (
								<Row
									stack
									label="TikTok"
									description={tiktokMode === "draft" ? t("Goes to your TikTok drafts: add music or effects in the app, then post.") : undefined}
									control={
										<Segmented
											equalWidth
											label="TikTok"
											size="sm"
											value={tiktokMode}
											options={[
												{ value: "post", label: t("Post now") },
												{ value: "draft", label: t("To drafts") },
											]}
											onChange={setTiktokMode}
										/>
									}
								/>
							)}
							<Row
								stack
								label={needed.length > 1 ? t("Videos") : t("Video")}
								description={
									!needed.length
										? t("Each platform gets its own format.")
										: reuse
											? needed.length > 1
												? t("Uses your {formats} exports (nothing changed since).", { formats: needed.join(t(" and ")) })
												: t("Uses your {formats} export (nothing changed since).", { formats: needed.join(t(" and ")) })
											: toExport.length < needed.length
												? t("Exports {formats} now, at this size; {done} is already exported.", { formats: toExport.join(t(" and ")), done: needed.filter((f) => !toExport.includes(f)).join(", ") })
												: t("Exports {formats} now, at this size.", { formats: toExport.join(t(" and ")) })
								}
								control={
									reuse ? (
										<CircleCheck className="size-4 text-success" />
									) : (
										<Segmented
											equalWidth
											label={t("Export size")}
											value={quality}
											options={[
												{ value: "small", label: t("Small") },
												{ value: "standard", label: t("Standard") },
												{ value: "high", label: t("High") },
											]}
											onChange={setQuality}
										/>
									)
								}
							/>
						</Card>
						<Button
							className="h-auto min-h-control w-full whitespace-normal py-2 leading-snug"
							disabled={!project.clips.length || !selected.length || busy || !translated.length}
							onClick={() => void publishVideo({ platforms: selected, formats, youtubePrivacy: privacy, tiktokMode, quality })}
						>
							{busy ? <Loader2 className="animate-spin" /> : <Send />}{" "}
							{selected.length ? t("Post to {platforms}", { platforms: selected.map((s) => PLATFORM_NAMES[s]).join(", ") }) : t("Choose where to post")}
						</Button>
						<TaskProgress prefix="export" />
						<TaskProgress prefix="publish" />
					</>
				}
			</Section>

			{(project.published ?? []).length > 0 && (
				<Section title={t("Posted")}>
					<Card className="px-0">
						{[...(project.published ?? [])].reverse().map((record) => (
							<div key={record.at} className="space-y-1 px-3 py-2.5">
								<p className="text-[11px] text-muted-foreground">{new Date(record.at).toLocaleString()}</p>
								{record.results.map((r) => (
									<div key={r.platform} className="flex items-center gap-2 text-xs">
										{r.state === "done" ? <CircleCheck className="size-3.5 text-success" /> : r.state === "failed" ? <CircleX className="size-3.5 text-destructive" /> : <Loader2 className="size-3.5 text-muted-foreground" />}
										<span className="w-16 font-medium">{PLATFORM_NAMES[r.platform]}</span>
										<span className="min-w-0 flex-1 truncate text-muted-foreground" title={r.message}>
											{r.state === "failed" ? r.message : r.state === "working" ? (r.message ?? t("Still processing")) : r.url ? "" : (r.message ?? t("Posted"))}
										</span>
										{r.url && (
											<Button variant="ghost" size="xs" onClick={() => void window.kroma.openExternal(r.url!)}>
												<ExternalLink /> {t("Open")}
											</Button>
										)}
									</div>
								))}
							</div>
						))}
					</Card>
				</Section>
			)}

			<CoverSection />

			<Section title={t("Subtitle files")} hint={t("For YouTube's subtitle upload, or to keep a copy.")}>
				<div className="grid grid-cols-1 gap-1.5 @[17rem]:grid-cols-2">
					<Button variant="outline" size="sm" disabled={!translated.length} onClick={() => void exportSrt("khmer")}>
						<FileDown /> {t("{language} .srt", { language: langName })}
					</Button>
					<Button variant="outline" size="sm" disabled={!project.cues.length} onClick={() => void exportSrt("source")}>
						<FileDown /> {t("Original .srt")}
					</Button>
				</div>
			</Section>
		</>
	);
}

/** A platform's format: 16:9 or 9:16. */
export function FormatPicker({ platform, value, onChange, disabled }: { platform: PublishPlatform; value: PostFormat; onChange: (f: PostFormat) => void; disabled?: boolean }) {
	return (
		<div className={cn("shrink-0", disabled && "pointer-events-none opacity-60")}>
			<Segmented size="sm" label={t("{platform} format", { platform: PLATFORM_NAMES[platform] })} value={value} options={POST_FORMATS.map((f) => ({ value: f, label: f }))} onChange={onChange} />
		</div>
	);
}

/** Whether the project has a current export in this format. */
function isExported(project: Project, format: PostFormat): boolean {
	const as = project.aspect === format ? project : { ...project, aspect: format };
	return Boolean(currentExport(as, format, videoFingerprint(as)));
}

/** One platform's post in the open project, editable in place (saved with the project). */
function PostEditor({ post }: { post: PlatformCaption }) {
	return <PostFields post={post} onBegin={() => useEditor.getState().checkpoint()} onChange={(patch) => updatePost(post.platform, patch)} />;
}

/** A post's title, text and hashtags, editable (the Post panel, and Batch → Ready to post). */
export function PostFields({ post, onChange, onBegin }: { post: PlatformCaption; onChange: (patch: Partial<PlatformCaption>) => void; onBegin?: () => void }) {
	const begin = () => onBegin?.();
	const text = `${post.title}\n\n${post.description}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`;
	return (
		<Card className="space-y-2 py-3">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{post.platform}</span>
				<CopyButton text={text} />
			</div>
			<Input lang="km" aria-label={t("{platform} title", { platform: post.platform })} className="font-khmer text-[13px] font-medium" value={post.title} onFocus={begin} onChange={(e) => onChange({ title: e.target.value })} />
			<Textarea lang="km" aria-label={t("{platform} text", { platform: post.platform })} className="min-h-20 font-khmer text-xs" value={post.description} onFocus={begin} onChange={(e) => onChange({ description: e.target.value })} />
			<HashtagInput post={post} onChange={(hashtags) => {
				begin();
				onChange({ hashtags });
			}} />
		</Card>
	);
}

/** Hashtags are typed freely ("#food #fyp") and saved when the field is left. */
function HashtagInput({ post, onChange }: { post: PlatformCaption; onChange: (hashtags: string[]) => void }) {
	const joined = post.hashtags.map((h) => `#${h}`).join(" ");
	const [draft, setDraft] = useState(joined);
	useEffect(() => setDraft(joined), [joined]);
	const commit = () => {
		const tags = draft.split(/[\s,]+/).map((h) => h.replace(/^#+/, "")).filter(Boolean);
		if (tags.join(" ") !== post.hashtags.join(" ")) onChange(tags);
	};
	return <Input aria-label={t("{platform} hashtags", { platform: post.platform })} className="text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />;
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<Button
			variant="ghost"
			size="xs"
			onClick={() => {
				void navigator.clipboard.writeText(text);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
		>
			{copied ? <Check /> : <Copy />} {copied ? t("Copied") : t("Copy")}
		</Button>
	);
}
