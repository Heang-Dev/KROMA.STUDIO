// While a batch runs the editor's actions on its projects (lib/batch.ts), they run without asking (no "replace these
// lines?") and without their own notices: the batch reports once per project. The first failure's reason is kept
// here, so the batch can say why a step failed. No imports, so the store, notify and actions can all read it.

export const batchMode = {
	on: false,
	/** Why the last step failed (a task's error, or an error notice an action showed). */
	lastError: null as string | null,
	/** What the last step said when it worked ("Translated 12 lines"), for the step's log. */
	lastNote: null as string | null,
};

/** Notes what a step said (its notice or toast, kept quiet while a batch runs). */
export function noteBatchMessage(message: string): void {
	if (batchMode.on) batchMode.lastNote = message;
}

/** Notes a failure while a batch runs (the first one in a step wins: later ones are usually knock-on effects). */
export function noteBatchError(message: string): void {
	if (batchMode.on && !batchMode.lastError) batchMode.lastError = message;
}
