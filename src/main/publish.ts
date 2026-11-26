import { openAsBlob } from "node:fs";
import { basename } from "node:path";
import type { PostAccount, PostProfile, PublishPlatform, PublishRequest, PublishResult } from "@shared/types";

// One-click posting through Upload-Post (upload-post.com): your YouTube, Facebook and TikTok accounts are connected
// once on their site; Kroma uploads the video once with each platform's own title and text, then follows the result.
// Docs: https://docs.upload-post.com/api/upload-video · status · user-profiles · current-user

const BASE = () => (process.env.KROMA_POST_API || "https://api.upload-post.com").replace(/\/$/, "");

async function call<T>(key: string, path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
	if (!key) throw new Error("Add your Upload-Post API key in Settings → Posting first.");
	let response: Response;
	try {
		response = await fetch(`${BASE()}${path}`, { ...init, headers: { Authorization: `Apikey ${key}`, ...(init.headers as Record<string, string>) }, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
	} catch (err) {
		if ((err as Error).name === "AbortError" || (err as Error).name === "TimeoutError") throw new Error("Upload-Post didn't answer in time. Check your internet and try again.");
		throw new Error("Can't reach Upload-Post. Check your internet connection.");
	}
	const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	if (response.status === 401) throw new Error("Upload-Post refused the API key. Copy it again from app.upload-post.com → API Keys into Settings → Posting.");
	if (response.status === 429) throw new Error("This month's Upload-Post uploads are used up (the free plan has 10). Upgrade the plan or wait for next month.");
	if (!response.ok || body.success === false) throw new Error(String(body.message ?? body.error ?? `Upload-Post error ${response.status}`));
	return body as T;
}

/** Checks the key and says whose account and plan it is. */
export async function postAccount(key: string): Promise<PostAccount> {
	const me = await call<{ email?: string; plan?: string }>(key, "/api/uploadposts/me", {}, 15_000);
	return { email: me.email ?? "", plan: me.plan ?? "" };
}

interface RawAccount {
	handle?: string;
	display_name?: string;
	username?: string;
	reauth_required?: boolean;
}

/** The profiles on the account and which social accounts each has connected. */
export async function postProfiles(key: string): Promise<PostProfile[]> {
	const res = await call<{ profiles?: { username: string; display_name?: string; social_accounts?: Record<string, RawAccount | string | null> }[] }>(key, "/api/uploadposts/users");
	return (res.profiles ?? []).map((p) => {
		const accounts: PostProfile["accounts"] = {};
		for (const platform of ["youtube", "facebook", "tiktok"] as PublishPlatform[]) {
			const a = p.social_accounts?.[platform];
			if (a && typeof a === "object") accounts[platform] = { name: a.display_name || a.handle || a.username || platform, handle: a.handle, needsReconnect: Boolean(a.reauth_required) };
		}
		return { username: p.username, displayName: p.display_name || p.username, accounts };
	});
}

/** A profile for Kroma's posts, made on first use (the free plan allows 2). */
export async function ensureProfile(key: string, wanted: string): Promise<string> {
	const profiles = await postProfiles(key);
	if (wanted && profiles.some((p) => p.username === wanted)) return wanted;
	if (profiles.length) return profiles[0].username;
	await call(key, "/api/uploadposts/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "kroma", display_name: "Kroma Studio" }) });
	return "kroma";
}

/** A one-time page (valid 48 h) where you sign in to YouTube, Facebook and TikTok to connect them to the profile. */
export async function connectLink(key: string, profile: string): Promise<string> {
	const res = await call<{ access_url: string }>(key, "/api/uploadposts/users/generate-jwt", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: profile, platforms: ["youtube", "facebook", "tiktok"], connect_title: "Connect your accounts to Kroma Studio" }),
	});
	return res.access_url;
}

export async function facebookPages(key: string, profile: string): Promise<{ id: string; name: string }[]> {
	const res = await call<{ pages?: { page_id: string; page_name: string }[] }>(key, `/api/uploadposts/facebook/pages?profile=${encodeURIComponent(profile)}`);
	return (res.pages ?? []).map((p) => ({ id: p.page_id, name: p.page_name }));
}

// Platform limits for the text (YouTube title 100, description 5000, tags 500 in all; TikTok caption 2200).
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const withTags = (text: string, tags: string[]) => [text.trim(), tags.map((t) => `#${t.replace(/^#/, "").replace(/\s+/g, "")}`).join(" ")].filter(Boolean).join("\n\n");

function youtubeTags(tags: string[]): string[] {
	const out: string[] = [];
	let total = 0;
	for (const t of tags.map((x) => x.replace(/^#/, "").trim()).filter(Boolean)) {
		if (total + t.length + 1 > 480) break;
		out.push(t);
		total += t.length + 1;
	}
	return out;
}

/** The multipart fields for one upload (without the file), in Upload-Post's names. */
export function uploadFields(req: PublishRequest): [string, string][] {
	const f: [string, string][] = [["user", req.profile], ["async_upload", "true"]];
	for (const p of req.platforms) f.push(["platform[]", p]);
	// `title` is required, and every platform falls back to it.
	f.push(["title", clip(req.youtube?.title || req.facebook?.title || req.tiktok?.caption || "Video", 100)]);
	if (req.platforms.includes("youtube") && req.youtube) {
		f.push(["youtube_title", clip(req.youtube.title, 100)], ["youtube_description", clip(withTags(req.youtube.description, req.youtube.tags), 5000)], ["privacyStatus", req.youtube.privacy]);
		for (const t of youtubeTags(req.youtube.tags)) f.push(["tags[]", t]);
	}
	if (req.platforms.includes("facebook") && req.facebook) {
		f.push(["facebook_title", clip(req.facebook.title, 255)], ["facebook_description", withTags(req.facebook.description, req.facebook.tags)], ["facebook_media_type", req.facebook.mediaType]);
		if (req.facebook.pageId) f.push(["facebook_page_id", req.facebook.pageId]);
	}
	if (req.platforms.includes("tiktok") && req.tiktok) {
		f.push(["tiktok_title", clip(withTags(req.tiktok.caption, req.tiktok.tags), 2200)]);
		if (req.tiktok.mode === "draft") f.push(["post_mode", "MEDIA_UPLOAD"]);
	}
	return f;
}

interface StatusResult {
	platform?: string;
	success?: boolean;
	status?: string;
	message?: string;
	error?: string;
	url?: string;
	post_url?: string | null;
}

/** Upload-Post answers with results keyed by platform (sync) or as a list (async status): one shape for Kroma. */
export function normaliseResults(results: unknown): PublishResult[] {
	const list: (StatusResult & { platform: string })[] = Array.isArray(results)
		? (results as StatusResult[]).filter((r) => r.platform).map((r) => ({ ...r, platform: r.platform! }))
		: Object.entries((results ?? {}) as Record<string, StatusResult>).map(([platform, r]) => ({ ...r, platform }));
	return list.map((r) => {
		const failed = r.success === false || r.status === "failed";
		const done = r.success === true || r.status === "completed";
		return {
			platform: r.platform as PublishPlatform,
			state: failed ? "failed" : done ? "done" : "working",
			url: r.post_url || r.url || undefined,
			message: r.error || r.message || undefined,
		};
	});
}

/**
 * Uploads the video once to every chosen platform and follows it until each platform is done.
 * The idempotency key stops a retried request from posting twice.
 */
export async function publish(key: string, req: PublishRequest, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<PublishResult[]> {
	const form = new FormData();
	for (const [name, value] of uploadFields(req)) form.append(name, value);
	form.append("video", await openAsBlob(req.video, { type: "video/mp4" }), basename(req.video));
	onProgress(-1, `Uploading the video to ${req.platforms.length} platform${req.platforms.length === 1 ? "" : "s"}…`);
	const started = await call<{ request_id?: string; results?: unknown }>(key, "/api/upload", { method: "POST", body: form, headers: { "Idempotency-Key": req.idempotencyKey }, signal }, 60 * 60_000);
	if (!started.request_id) return normaliseResults(started.results);

	// Videos take a while on each platform: Upload-Post suggests checking every 10–15 s.
	const deadline = Date.now() + 30 * 60_000;
	let last: PublishResult[] = req.platforms.map((platform) => ({ platform, state: "working" }));
	await new Promise((r) => setTimeout(r, 5000));
	while (Date.now() < deadline) {
		if (signal?.aborted) throw new Error("Stopped following the post. It may still finish on the platforms.");
		const status = await call<{ status?: string; completed?: number; total?: number; results?: unknown }>(key, `/api/uploadposts/status?request_id=${encodeURIComponent(started.request_id)}`).catch(() => null);
		if (status) {
			const now = normaliseResults(status.results);
			last = req.platforms.map((p) => now.find((r) => r.platform === p) ?? { platform: p, state: status.status === "failed" ? "failed" : "working" });
			const done = last.filter((r) => r.state !== "working").length;
			onProgress(done / req.platforms.length, `Posting · ${done}/${req.platforms.length} platforms done`);
			if (done === req.platforms.length || status.status === "completed" || status.status === "failed") return last;
		}
		await new Promise((r) => setTimeout(r, 12_000));
	}
	return last.map((r) => (r.state === "working" ? { ...r, message: "Still processing on the platform. Check it there in a few minutes." } : r));
}
