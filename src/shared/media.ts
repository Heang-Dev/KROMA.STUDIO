// Local files reach the editor as kroma://media/<path>. Mac and Linux paths start with "/"; Windows paths
// ("C:\Users\…") become "/C:/Users/…" in the link and turn back into "C:/Users/…" when served.

export function mediaUrl(path: string): string {
	const p = path.replace(/\\/g, "/");
	return `kroma://media${p.startsWith("/") ? "" : "/"}${p.split("/").map(encodeURIComponent).join("/")}`;
}

/** The file a kroma://media link points to, from the link's (still encoded) path. */
export function mediaPath(urlPathname: string, platform: string = process.platform): string {
	const path = decodeURIComponent(urlPathname.replace(/^\/+/, "/"));
	return platform === "win32" && /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path;
}
