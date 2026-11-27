import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type BrowserWindow, dialog } from "electron";
import { type BatchState, EMPTY_BATCH, type PostFormat, afterRestart, exportPathFor } from "@shared/batch";
import { LIBRARY_DIR } from "./download";
import { loadSettings } from "./settings";

// The batch list (src/shared/batch.ts) is kept in <library>/batch.json, so a restart shows where it stopped. The
// editor runs the steps; this file only stores the list and answers where things go.

const batchFile = () => join(LIBRARY_DIR, "batch.json");

export function readBatch(): BatchState {
	try {
		const saved = JSON.parse(readFileSync(batchFile(), "utf8")) as Partial<BatchState>;
		return afterRestart({ items: saved.items ?? [], options: { ...EMPTY_BATCH.options, ...saved.options } });
	} catch {
		// First time: writing the posts is on when there's an AI key to write them with.
		const s = loadSettings();
		return { ...EMPTY_BATCH, options: { ...EMPTY_BATCH.options, writePosts: Boolean(s.geminiKey || s.anthropicKey) } };
	}
}

/** Written to a temporary file first, so a crash never leaves half a list. */
export function writeBatch(state: BatchState): void {
	mkdirSync(LIBRARY_DIR, { recursive: true });
	const tmp = `${batchFile()}.tmp`;
	writeFileSync(tmp, JSON.stringify(state, null, "\t"));
	renameSync(tmp, batchFile());
}

/** Asks for project files (several at once). */
export async function pickProjects(window: BrowserWindow): Promise<string[]> {
	const res = await dialog.showOpenDialog(window, { properties: ["openFile", "multiSelections"], defaultPath: join(LIBRARY_DIR, "projects"), filters: [{ name: "Kroma project", extensions: ["kroma"] }] });
	return res.canceled ? [] : res.filePaths;
}

/** Where a batch export goes: <export folder>/<group>/<NN - title> (16x9).mp4 (the folder is made). */
export function batchExportPath(projectPath: string, format: PostFormat): string {
	const dir = loadSettings().exportDir || join(LIBRARY_DIR, "Exports");
	const path = exportPathFor(dir, projectPath, format);
	mkdirSync(dirname(path), { recursive: true });
	return path;
}
