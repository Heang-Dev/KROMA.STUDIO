import { useState } from "react";
import { Check, Copy, MagicWand } from "@phosphor-icons/react";
import type { PlatformCaption } from "@shared/types";
import { exportSrt } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { Button, Section, TaskProgress, useBusy } from "./ui";

export function PostPanel() {
	const project = useEditor((s) => s.project);
	const [posts, setPosts] = useState<PlatformCaption[]>([]);
	const busy = useBusy("captions");
	const translated = project.cues.filter((c) => c.text.trim());

	const generate = async () => {
		const transcript = translated.map((c) => c.text).join("\n");
		const result = await runTask(`captions-${Date.now()}`, "Write posts", (id) => window.kroma.captions(id, { transcript, title: project.name, context: project.context }));
		if (result) setPosts(result);
	};

	return (
		<>
			<Section title="Write the posts" hint="Claude reads the Khmer subtitles and writes a title, description and hashtags in Khmer for each platform.">
				<Button variant="primary" className="w-full" disabled={!translated.length || busy} onClick={() => void generate()}>
					<MagicWand size={16} weight="fill" /> Write YouTube, Facebook and TikTok posts
				</Button>
				{!translated.length && <p className="mt-2 text-xs text-dim">Make the Khmer subtitles first.</p>}
				<TaskProgress prefix="captions" />
			</Section>

			{posts.map((post) => (
				<Section key={post.platform} title={post.platform} action={<CopyButton text={`${post.title}\n\n${post.description}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`} />}>
					<p className="font-khmer text-[14px] font-semibold leading-relaxed select-text">{post.title}</p>
					<p className="mt-2 whitespace-pre-line font-khmer text-[13px] leading-relaxed text-muted select-text">{post.description}</p>
					<p className="mt-2 text-xs text-accent select-text">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
				</Section>
			))}

			<Section title="Subtitle files" hint="For YouTube's subtitle upload, or to keep a copy.">
				<div className="grid grid-cols-2 gap-2">
					<Button disabled={!translated.length} onClick={() => void exportSrt("khmer")}>Khmer .srt</Button>
					<Button disabled={!project.cues.length} onClick={() => void exportSrt("source")}>Original .srt</Button>
				</div>
			</Section>
		</>
	);
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<Button
			variant="ghost"
			className="h-7 px-2 text-xs"
			onClick={() => {
				void navigator.clipboard.writeText(text);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
		>
			{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
		</Button>
	);
}
