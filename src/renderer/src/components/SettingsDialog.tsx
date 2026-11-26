import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { SettingsView } from "@shared/types";
import { useEditor } from "@/state/store";
import { Button, IconButton, Label, inputClass } from "./ui";

const MODELS = [
	{ id: "claude-opus-5-5", label: "Claude Opus 5.5: best Khmer" },
	{ id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5: good and cheaper" },
	{ id: "claude-haiku-5-5", label: "Claude Haiku 5.5: cheapest, for drafts" },
];

const ASR_PRESETS = [
	{ label: "Groq (fast, free to start)", baseUrl: "https://api.groq.com/openai/v1", model: "whisper-large-v3", keyUrl: "https://console.groq.com/keys" },
	{ label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "whisper-1", keyUrl: "https://platform.openai.com/api-keys" },
];

export function SettingsDialog({ onClose }: { onClose: () => void }) {
	const [view, setView] = useState<SettingsView | null>(null);
	const [anthropicKey, setAnthropicKey] = useState("");
	const [asrKey, setAsrKey] = useState("");
	const [form, setForm] = useState({ translateModel: "", asrBaseUrl: "", asrModel: "", concurrency: 4, cookiesBrowser: "" });

	useEffect(() => {
		void window.kroma.getSettings().then((v) => {
			setView(v);
			setForm({ translateModel: v.translateModel, asrBaseUrl: v.asrBaseUrl, asrModel: v.asrModel, concurrency: v.concurrency, cookiesBrowser: v.cookiesBrowser });
		});
	}, []);

	const save = async () => {
		await window.kroma.saveSettings({ ...form, anthropicKey, asrKey });
		useEditor.getState().showToast("Settings saved.");
		onClose();
	};

	const preset = ASR_PRESETS.find((p) => p.baseUrl === form.asrBaseUrl);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onMouseDown={onClose}>
			<div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-lg rounded-xl border border-line bg-panel shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
				<header className="flex items-center justify-between border-b border-line px-5 py-3.5">
					<h2 id="settings-title" className="text-sm font-semibold">Settings</h2>
					<IconButton label="Close" onClick={onClose}>
						<X size={16} />
					</IconButton>
				</header>
				{view && (
					<div className="space-y-5 px-5 py-5">
						<fieldset>
							<legend className="mb-2 text-[13px] font-semibold">Translation (Claude)</legend>
							<Label>Anthropic API key {view.hasAnthropicKey && <span className="text-ok">· saved</span>}</Label>
							<input className={inputClass} type="password" placeholder={view.hasAnthropicKey ? "Leave empty to keep the saved key" : "sk-ant-…"} value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} />
							<button type="button" className="mt-1 text-xs text-accent hover:underline" onClick={() => void window.kroma.openExternal("https://platform.claude.com/settings/keys")}>
								Get a key
							</button>
							<div className="mt-3">
								<Label>Model</Label>
								<select className={inputClass} value={form.translateModel} onChange={(e) => setForm({ ...form, translateModel: e.target.value })}>
									{MODELS.map((m) => (
										<option key={m.id} value={m.id}>{m.label}</option>
									))}
								</select>
							</div>
						</fieldset>

						<fieldset>
							<legend className="mb-2 text-[13px] font-semibold">Speech to text</legend>
							<div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
								{ASR_PRESETS.map((p) => (
									<button
										key={p.label}
										type="button"
										onClick={() => setForm({ ...form, asrBaseUrl: p.baseUrl, asrModel: p.model })}
										className={`rounded px-2 py-1.5 text-xs ${form.asrBaseUrl === p.baseUrl ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}
									>
										{p.label}
									</button>
								))}
							</div>
							<Label>API key {view.hasAsrKey && <span className="text-ok">· saved</span>}</Label>
							<input className={inputClass} type="password" placeholder={view.hasAsrKey ? "Leave empty to keep the saved key" : "gsk_…"} value={asrKey} onChange={(e) => setAsrKey(e.target.value)} />
							{preset && (
								<button type="button" className="mt-1 text-xs text-accent hover:underline" onClick={() => void window.kroma.openExternal(preset.keyUrl)}>
									Get a key
								</button>
							)}
							<details className="mt-3">
								<summary className="cursor-pointer text-xs text-dim">Advanced</summary>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<label>
										<Label>Endpoint</Label>
										<input className={inputClass} value={form.asrBaseUrl} onChange={(e) => setForm({ ...form, asrBaseUrl: e.target.value })} />
									</label>
									<label>
										<Label>Model</Label>
										<input className={inputClass} value={form.asrModel} onChange={(e) => setForm({ ...form, asrModel: e.target.value })} />
									</label>
									<label>
										<Label>Parallel requests</Label>
										<input className={inputClass} type="number" min={1} max={12} value={form.concurrency} onChange={(e) => setForm({ ...form, concurrency: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
									</label>
								</div>
							</details>
						</fieldset>
						<fieldset>
							<legend className="mb-2 text-[13px] font-semibold">Downloads</legend>
							<Label>Use my logins from</Label>
							<select className={inputClass} value={form.cookiesBrowser} onChange={(e) => setForm({ ...form, cookiesBrowser: e.target.value })}>
								<option value="">Nothing (only public videos)</option>
								<option value="chrome">Chrome</option>
								<option value="safari">Safari</option>
								<option value="firefox">Firefox</option>
								<option value="edge">Edge</option>
								<option value="brave">Brave</option>
							</select>
							<p className="mt-1 text-xs leading-relaxed text-dim">Sign in to Bilibili, Douyin or YouTube in that browser to get 1080p and members-only videos. Your Mac may ask to allow access the first time; Safari also needs Full Disk Access.</p>
						</fieldset>
						<p className="text-xs leading-relaxed text-dim">Keys are encrypted with your Mac's keychain and only sent to the service they belong to.</p>
					</div>
				)}
				<footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
					<Button variant="ghost" onClick={onClose}>Cancel</Button>
					<Button variant="primary" onClick={() => void save()}>Save</Button>
				</footer>
			</div>
		</div>
	);
}
