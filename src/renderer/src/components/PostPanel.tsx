import { useState } from "react";
import { Check, Copy, FileDown, WandSparkles } from "lucide-react";
import type { PlatformCaption } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportSrt } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { Card, Section, TaskProgress, useBusy } from "./common";

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
			<Section title="Social posts" hint="AI (Gemini or Claude) reads the Khmer subtitles and writes a title, description and hashtags in Khmer for YouTube, Facebook and TikTok.">
				<Button className="h-auto min-h-9 w-full whitespace-normal py-2 leading-snug" disabled={!translated.length || busy} onClick={() => void generate()}>
					<WandSparkles /> Write the posts
				</Button>
				{!translated.length && <p className="text-xs text-muted-foreground">Make the Khmer subtitles first.</p>}
				<TaskProgress prefix="captions" />
			</Section>

			{posts.map((post) => (
				<Section key={post.platform} title={post.platform} action={<CopyButton text={`${post.title}\n\n${post.description}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}`} />}>
					<Card className="py-3" >
						<div lang="km" className="space-y-2">
							<p className="text-sm font-semibold select-text">{post.title}</p>
							<p className="text-xs whitespace-pre-line text-muted-foreground select-text">{post.description}</p>
							<div className="flex flex-wrap gap-1 pt-1">
								{post.hashtags.map((h) => (
									<Badge key={h} variant="secondary" className="font-normal select-text">
										#{h}
									</Badge>
								))}
							</div>
						</div>
					</Card>
				</Section>
			))}

			<Section title="Subtitle files" hint="For YouTube's subtitle upload, or to keep a copy.">
				<div className="grid grid-cols-1 gap-1.5 @[19rem]:grid-cols-2">
					<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!translated.length} onClick={() => void exportSrt("khmer")}>
						<FileDown /> Khmer .srt
					</Button>
					<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!project.cues.length} onClick={() => void exportSrt("source")}>
						<FileDown /> Original .srt
					</Button>
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
			size="xs"
			onClick={() => {
				void navigator.clipboard.writeText(text);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
		>
			{copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
		</Button>
	);
}
