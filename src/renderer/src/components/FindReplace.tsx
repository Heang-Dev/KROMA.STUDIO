import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countInLines, replaceInLines } from "@/lib/actions";
import { useEditor } from "@/state/store";
import { t } from "@shared/i18n";

/** Fix a word everywhere at once (e.g. a name or a foreign word the translator spelled wrong). */
export function FindReplace({ open, onOpenChange, initial = "" }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: string }) {
	const project = useEditor((s) => s.project);
	const [find, setFind] = useState(initial);
	const [replace, setReplace] = useState("");
	const [remember, setRemember] = useState(true);
	useEffect(() => {
		if (open) {
			setFind(initial);
			setReplace("");
		}
	}, [open, initial]);
	const count = countInLines(project, find);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("Find and replace")}</DialogTitle>
					<DialogDescription>{t("Fix a word in every translated line at once, like a name or a foreign word spelled wrong.")}</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="fr-find">{t("Find")}</Label>
						<Input id="fr-find" lang="km" className="font-khmer" value={find} onChange={(e) => setFind(e.target.value)} autoFocus />
						<p className="text-xs text-muted-foreground">{find ? (count === 1 ? t("In {n} line", { n: count }) : t("In {n} lines", { n: count })) : t("Type or paste the wrong word")}</p>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="fr-replace">{t("Replace with")}</Label>
						<Input id="fr-replace" lang="km" className="font-khmer" value={replace} onChange={(e) => setReplace(e.target.value)} />
					</div>
					<label className="flex items-start gap-2.5 text-xs leading-relaxed">
						<Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} className="mt-0.5" />
						<span>{t("Remember for future translations (adds it to the notes for the translator)")}</span>
					</label>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("Cancel")}
					</Button>
					<Button
						disabled={!count}
						onClick={() => {
							const n = replaceInLines(find, replace, remember);
							useEditor.getState().showToast(n === 1 ? t("Replaced in {n} line", { n }) : t("Replaced in {n} lines", { n }), "info", remember ? t("Added to the notes, so the next translation spells it right.") : undefined);
							onOpenChange(false);
						}}
					>
						{count === 1 ? t("Replace in {n} line", { n: count }) : t("Replace in {n} lines", { n: count || "" })}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
