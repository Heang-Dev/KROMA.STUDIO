// Each character's colour, by their place in the cast (the same in the Voice panel and the subtitles).
const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6", "#f97316", "#14b8a6", "#db2777", "#4f46e5", "#64748b"];

export const castColor = (index: number): string => (index < 0 ? "transparent" : COLORS[index % COLORS.length]);
