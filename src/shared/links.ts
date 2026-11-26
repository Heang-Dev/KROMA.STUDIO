// Cleans what people paste into the link box before it goes to yt-dlp.

/** The first http(s) link in pasted text: share messages wrap the link in other words ("复制打开抖音… https://v.douyin.com/x/"). */
export function extractLink(text: string): string | null {
	const match = text.match(/https?:\/\/[^\s"'<>，。！）)]+/i);
	return match ? match[0] : null;
}

/**
 * The title inside a pasted share message, when there is one:
 * "【Is hamburger really junk food?】 https://…" (Bilibili), "《…》", "「…」", or plain words before the link.
 * App boilerplate ("复制打开抖音，看看") and trailing share counters are dropped.
 */
export function extractShareTitle(text: string): string | null {
	const link = extractLink(text);
	const bracketed = text.match(/[【《「『]([^】》」』]{2,200})[】》」』]/);
	if (bracketed) return tidyTitle(bracketed[1]);
	if (!link) return null;
	const before = text.slice(0, text.indexOf(link));
	return tidyTitle(before.replace(/^\s*[\d.]+\s*/, "").replace(/复制(打开|此链接).*?[，,]?\s*(看看)?/g, ""));
}

function tidyTitle(title: string): string | null {
	const t = title.replace(/\s+/g, " ").replace(/[\s#@]+$/, "").trim();
	return t.length >= 2 ? t.slice(0, 120) : null;
}

// Query parameters that only track who shared the link; they never change which video it is.
const TRACKING = /^(share_|spm_|vd_source|from_|utm_|is_story_h5|mid$|plat_id|timestamp|unique_k|up_id|buvid|session_id|bbid|ts$|si$|feature$|pp$|t$)/;

/**
 * Turns a pasted link into one yt-dlp recognises:
 * - Bilibili's language paths (bilibili.com/en/video/…) become bilibili.com/video/…
 * - tracking parameters are dropped (Bilibili's `p`, the part of a multi-part video, is kept)
 */
export function normalizeLink(input: string): string {
	const raw = extractLink(input.trim()) ?? input.trim();
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return raw;
	}
	const host = url.hostname.replace(/^www\.|^m\./, "");
	if (host === "bilibili.com") {
		url.hostname = "www.bilibili.com";
		url.pathname = url.pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2,4})?(?=\/video\/)/i, "");
	}
	for (const key of [...url.searchParams.keys()]) {
		if (host === "bilibili.com" && key === "p") continue;
		if (host.endsWith("youtube.com") && key === "t") continue; // a start time is harmless to keep for YouTube
		if (TRACKING.test(key)) url.searchParams.delete(key);
	}
	return url.toString();
}

/** People-friendly reason for a failed download, from yt-dlp's error text. */
export function downloadErrorMessage(error: string): string {
	const e = error.toLowerCase();
	if (e.includes("drm") || e.includes("encrypted")) return "This video is protected (encrypted), so it can't be downloaded.";
	if (e.includes("unsupported url") || e.includes("generic information extractor") || e.includes("unusual and will be skipped"))
		return "This link isn't a video page Kroma can download from. Open the video itself and copy its link, or check the site is supported.";
	if (e.includes("private") || e.includes("sign in") || e.includes("login") || e.includes("log in") || e.includes("cookies") || e.includes("premium member") || e.includes("members-only"))
		return "This video needs you to be signed in. Choose your browser in Settings → Downloads, sign in to the site there, then try again.";
	if (e.includes("http error 404") || e.includes("not found") || e.includes("video unavailable") || e.includes("has been removed")) return "The video isn't available any more (removed, or the link is wrong).";
	if (e.includes("geo") || e.includes("not available in your country")) return "This video isn't available from your country.";
	if (e.includes("timed out") || e.includes("network") || e.includes("connection")) return "The connection failed. Check your internet and try again.";
	const last = error.trim().split("\n").filter((l) => /error/i.test(l)).pop() ?? error.trim().split("\n").pop() ?? error;
	return last.replace(/^ERROR:\s*/i, "").slice(0, 240);
}
