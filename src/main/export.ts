import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nativeImage } from "electron";
import type { ExportRequest, FitMode } from "@shared/types";
import { requireTool, run } from "./tools";
import { buildVoiceTrack } from "./voice";

// Renders the timeline with ffmpeg. Subtitles arrive as PNG images drawn by the editor (Chromium shapes Khmer
// correctly, so the export looks exactly like the preview and doesn't depend on ffmpeg having libass).

const FPS = 30;

export async function exportVideo(
	req: ExportRequest,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<string> {
	if (!req.clips.length) throw new Error("The timeline is empty.");
	const ffmpeg = requireTool("ffmpeg");
	const dir = mkdtempSync(join(tmpdir(), "kroma-export-"));
	const total = req.clips.reduce((n, c) => n + (c.out - c.in), 0);

	try {
		const args: string[] = ["-y", "-hide_banner", "-nostats", "-progress", "pipe:1"];
		const filters: string[] = [];
		// Inputs: every clip's video first, then any separate clip sounds (voice-free backgrounds), so indexes are predictable.
		req.clips.forEach((clip) => args.push("-ss", clip.in.toFixed(3), "-t", (clip.out - clip.in).toFixed(3), "-i", clip.path));
		let nextInput = req.clips.length;
		req.clips.forEach((clip, i) => {
			filters.push(videoChain(`[${i}:v]`, `[v${i}]`, req.width, req.height, req.fit, i));
			const length = (clip.out - clip.in).toFixed(3);
			let source = clip.hasAudio ? `[${i}:a]` : "";
			if (clip.audioPath) {
				args.push("-ss", clip.in.toFixed(3), "-t", length, "-i", clip.audioPath);
				source = `[${nextInput++}:a]`;
			}
			filters.push(
				source
					? `${source}aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=0:${length},asetpts=PTS-STARTPTS[a${i}]`
					: `anullsrc=r=48000:cl=stereo,atrim=0:${length},aformat=sample_fmts=fltp[a${i}]`,
			);
		});
		const n = nextInput; // index of the next input (subtitle images, then the voice track)
		filters.push(`${req.clips.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${req.clips.length}:v=1:a=1[vc][aout]`);

		let videoOut = "[vc]";
		if (req.overlays.length) {
			const list = writeOverlayList(dir, req);
			args.push("-f", "concat", "-safe", "0", "-i", list);
			filters.push(`[${n}:v]format=rgba[subs]`, `[vc][subs]overlay=0:${Math.round(req.bandTop)}:eof_action=pass:format=auto[vout]`);
			videoOut = "[vout]";
		}

		let audioOut = "[aout]";
		if (req.voice?.lines.length) {
			const track = join(dir, "voice.wav");
			await buildVoiceTrack(req.voice.lines, total, track, onProgress, signal);
			const index = n + (req.overlays.length ? 1 : 0);
			args.push("-i", track);
			filters.push(
				`[aout]volume=${req.voice.originalVolume.toFixed(2)}[orig]`,
				`[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[vo]`,
				"[orig][vo]amix=inputs=2:duration=first:normalize=0[amix]",
			);
			audioOut = "[amix]";
		}

		args.push("-filter_complex", filters.join(";"), "-map", videoOut, "-map", audioOut);
		const fast = req.quality === "fast" && process.platform === "darwin";
		args.push(
			...(fast ? ["-c:v", "h264_videotoolbox", "-b:v", req.height >= 1080 ? "10M" : "6M", "-allow_sw", "1"] : ["-c:v", "libx264", "-preset", "medium", "-crf", "19"]),
			"-pix_fmt",
			"yuv420p",
			"-r",
			String(FPS),
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"-movflags",
			"+faststart",
			req.outPath,
		);

		onProgress(0, "Exporting…");
		await run(ffmpeg, args, {
			signal,
			onLine: (line) => {
				const m = line.match(/^out_time_us=(\d+)/);
				if (m) {
					const seconds = Number(m[1]) / 1e6;
					onProgress(Math.min(0.999, seconds / total), `Exporting · ${formatClock(seconds)} / ${formatClock(total)}`);
				}
			},
		});
		return req.outPath;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function videoChain(input: string, output: string, W: number, H: number, fit: FitMode, i: number): string {
	const tail = `setsar=1,fps=${FPS},format=yuv420p,setpts=PTS-STARTPTS${output}`;
	if (fit === "fill") return `${input}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},${tail}`;
	if (fit === "black") return `${input}scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,${tail}`;
	// Blurred copy of the video behind it, the usual look for horizontal video in a vertical post.
	const w = even(W / 8);
	const h = even(H / 8);
	return (
		`${input}split=2[bg${i}][fg${i}];` +
		`[bg${i}]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=6:2,scale=${W}:${H},eq=brightness=-0.08[bgb${i}];` +
		`[fg${i}]scale=${W}:${H}:force_original_aspect_ratio=decrease[fgs${i}];` +
		`[bgb${i}][fgs${i}]overlay=(W-w)/2:(H-h)/2,${tail}`
	);
}

/** Writes the subtitle PNGs and an ffconcat list that shows each one for its time, with a blank image in between. */
function writeOverlayList(dir: string, req: ExportRequest): string {
	const blank = join(dir, "blank.png");
	const bandW = req.width;
	const bandH = Math.round(req.bandHeight);
	writeFileSync(blank, nativeImage.createFromBitmap(Buffer.alloc(bandW * bandH * 4), { width: bandW, height: bandH }).toPNG());

	const quote = (p: string) => `'${p.replace(/'/g, "'\\''")}'`;
	const lines = ["ffconcat version 1.0"];
	const sorted = [...req.overlays].sort((a, b) => a.start - b.start);
	let t = 0;
	sorted.forEach((overlay, i) => {
		const start = Math.max(overlay.start, t);
		const end = overlay.end;
		if (end - start < 0.04) return;
		if (start - t > 0.001) lines.push(`file ${quote(blank)}`, `duration ${(start - t).toFixed(3)}`);
		const file = join(dir, `sub${i}.png`);
		writeFileSync(file, overlay.png);
		lines.push(`file ${quote(file)}`, `duration ${(end - start).toFixed(3)}`);
		t = end;
	});
	// The last entry's duration is only honoured when another file follows it.
	lines.push(`file ${quote(blank)}`, "duration 1", `file ${quote(blank)}`);
	const list = join(dir, "subs.ffconcat");
	writeFileSync(list, lines.join("\n"));
	return list;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function formatClock(seconds: number): string {
	const s = Math.floor(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
}
