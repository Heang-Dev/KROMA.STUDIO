// How much a voice line is sped up to fit before the next line starts. Shared by the preview and the export.
export const MAX_TEMPO = 1.6;

export function voiceTempo(duration: number, start: number, slotEnd: number): number {
	const slot = Math.max(0.2, slotEnd - start);
	return Math.min(MAX_TEMPO, Math.max(1, duration / slot));
}
