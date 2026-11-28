import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { MyStyle } from "@shared/types";

// "My styles": subtitle styles saved by the person (Style → Save as my style), for every project and for Batch.
const file = () => join(app.getPath("userData"), "my-styles.json");

export function loadMyStyles(): MyStyle[] {
	if (!existsSync(file())) return [];
	try {
		const list = JSON.parse(readFileSync(file(), "utf8")) as MyStyle[];
		return Array.isArray(list) ? list.filter((s) => s && typeof s.id === "string" && typeof s.name === "string" && s.style) : [];
	} catch {
		return [];
	}
}

export function saveMyStyles(list: MyStyle[]): MyStyle[] {
	const clean = list.filter((s) => s.id && s.name.trim() && s.style).map((s) => ({ id: s.id, name: s.name.trim().slice(0, 40), style: s.style }));
	writeFileSync(file(), JSON.stringify(clean, null, "\t"));
	return clean;
}
