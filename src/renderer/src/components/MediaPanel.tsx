import { useState } from "react";
import { Captions, Download, Film, FolderOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appendToTimeline, downloadFromLink, importFiles } from "@/lib/actions";
import { formatTime } from "@/lib/timeline";
import { useEditor } from "@/state/store";
import { Card, IconButton, Section, TaskProgress, useBusy } from "./common";

export function MediaPanel() {
	const media = useEditor((s) => s.project.media);
	const [url, setUrl] = useState("");
	const downloading = useBusy("download");

	const submit = async () => {
		if (!/^https?:\/\//i.test(url.trim())) return useEditor.getState().showToast("Paste a full link that starts with https://", "error");
		const ok = await downloadFromLink(url);
		if (ok) setUrl("");
	};

	return (
		<>
			<Section title="Download from a link" hint="YouTube, Bilibili, Douyin, Youku, iQiyi, Facebook, TikTok and 1,000+ more. The site's own subtitles come too.">
				<form
					className="flex gap-1.5"
					onSubmit={(e) => {
						e.preventDefault();
						void submit();
					}}
				>
					<Input className="h-8 text-xs" placeholder="https://www.bilibili.com/video/…" value={url} onChange={(e) => setUrl(e.target.value)} disabled={downloading} aria-label="Video link" />
					<Button type="submit" size="sm" disabled={downloading || !url.trim()}>
						<Download /> Get
					</Button>
				</form>
				<TaskProgress prefix="download" />
			</Section>

			<Section
				title="Media"
				action={
					<Button variant="outline" size="xs" onClick={() => void importFiles()}>
						<FolderOpen /> Import
					</Button>
				}
			>
				{media.length === 0 ? (
					<p className="text-xs text-muted-foreground">No videos yet. Download one or import a file from your Mac.</p>
				) : (
					<Card className="px-0 [&>*+*]:border-t">
						{media.map((m) => {
							const subs = Object.keys(m.siteSubtitles ?? {});
							return (
								<div key={m.id} className="flex items-center gap-2.5 px-3 py-2.5">
									<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
										<Film className="size-4" />
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-[13px]" title={m.name}>
											{m.name}
										</p>
										<p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
											<span className="tabular-nums">{formatTime(m.duration)}</span>· {m.width}×{m.height}
											{subs.length > 0 && (
												<Badge variant="secondary" className="h-4 gap-1 px-1.5 text-[10px]" title="This video came with subtitles from the site">
													<Captions className="size-3" /> {subs.join(", ")}
												</Badge>
											)}
										</p>
									</div>
									<IconButton label="Add to the end of the timeline" size="icon-xs" onClick={() => appendToTimeline(m)}>
										<Plus />
									</IconButton>
								</div>
							);
						})}
					</Card>
				)}
			</Section>
		</>
	);
}
