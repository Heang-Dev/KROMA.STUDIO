import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import type { MediaItem } from "@shared/types";
import { requireTool, run } from "./tools";
import { t } from "@shared/i18n";

interface ProbeStream {
	codec_type: string;
	width?: number;
	height?: number;
	tags?: { rotate?: string };
	side_data_list?: { rotation?: number }[];
}

export async function probe(path: string): Promise<MediaItem> {
	const out = await run(requireTool("ffprobe"), ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]);
	const data = JSON.parse(out) as { format: { duration?: string }; streams: ProbeStream[] };
	const video = data.streams.find((s) => s.codec_type === "video");
	const hasAudio = data.streams.some((s) => s.codec_type === "audio");
	const duration = Number.parseFloat(data.format.duration ?? "0");
	if (!video && !hasAudio) throw new Error(t("This file has no video or audio."));
	if (!(duration > 0)) throw new Error(t("Couldn't read how long this file is."));

	let width = video?.width ?? 0;
	let height = video?.height ?? 0;
	const rotation = Math.abs(Number(video?.tags?.rotate ?? video?.side_data_list?.[0]?.rotation ?? 0));
	if (rotation === 90 || rotation === 270) [width, height] = [height, width];

	return { id: randomUUID(), path, name: basename(path), duration, width, height, hasAudio };
}
