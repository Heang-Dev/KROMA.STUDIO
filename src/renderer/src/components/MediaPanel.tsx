import { useState } from "react";
import { DownloadSimple, FilmStrip, FolderOpen, Plus, Subtitles } from "@phosphor-icons/react";
import { appendToTimeline, downloadFromLink, importFiles } from "@/lib/actions";
import { formatTime } from "@/lib/timeline";
import { useEditor } from "@/state/store";
import { Button, IconButton, Section, TaskProgress, inputClass, useBusy } from "./ui";

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
			<Section title="Download from a link" hint="YouTube, Bilibili, Douyin, Youku, iQiyi, Facebook, TikTok and 1,000+ more sites. The site's own subtitles come too when it has them.">
				<form
					className="flex gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						void submit();
					}}
				>
					<input className={inputClass} placeholder="https://www.bilibili.com/video/…" value={url} onChange={(e) => setUrl(e.target.value)} disabled={downloading} />
					<Button type="submit" variant="primary" disabled={downloading || !url.trim()} aria-label="Download">
						<DownloadSimple size={16} weight="bold" />
					</Button>
				</form>
				<TaskProgress prefix="download" />
			</Section>

			<Section title="Media" action={<Button onClick={() => void importFiles()}><FolderOpen size={15} /> Import</Button>}>
				{media.length === 0 ? (
					<p className="text-xs text-dim">No videos yet. Download one or import a file from your Mac.</p>
				) : (
					<ul className="space-y-1.5">
						{media.map((m) => (
							<li key={m.id} className="group flex items-center gap-2.5 rounded-md border border-line bg-bg px-2.5 py-2">
								<FilmStrip size={18} className="shrink-0 text-dim" />
								<div className="min-w-0 flex-1">
									<p className="truncate text-[13px]" title={m.name}>{m.name}</p>
									<p className="flex items-center gap-2 text-[11px] text-dim">
										{formatTime(m.duration)} · {m.width}×{m.height}
										{Object.keys(m.siteSubtitles ?? {}).length > 0 && (
											<span className="inline-flex items-center gap-0.5 text-accent" title="This video came with subtitles from the site">
												<Subtitles size={12} /> {Object.keys(m.siteSubtitles ?? {}).join(", ")}
											</span>
										)}
									</p>
								</div>
								<IconButton label="Add to the end of the timeline" onClick={() => appendToTimeline(m)}>
									<Plus size={15} />
								</IconButton>
							</li>
						))}
					</ul>
				)}
			</Section>
		</>
	);
}
