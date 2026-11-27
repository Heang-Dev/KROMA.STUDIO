import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Info, Loader2, TriangleAlert } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { isDark } from "@/lib/appearance";

/**
 * The app's one toaster, styled like Orca's notices: a compact card in the popover colours, a coloured icon per kind,
 * a short title with a muted detail line, bottom-right so it never covers the video. Errors stay longer and can be
 * closed. (components/ui/sonner stays stock shadcn; its next-themes hook doesn't apply in this app.)
 */
export function AppToaster() {
	const [dark, setDark] = useState(isDark());
	useEffect(() => {
		const observer = new MutationObserver(() => setDark(isDark()));
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	return (
		<Sonner
			theme={dark ? "dark" : "light"}
			position="bottom-right"
			// Above the status bar along the bottom.
			offset={{ right: 16, bottom: 40 }}
			gap={8}
			visibleToasts={4}
			// Listed one above another (Orca's notices), not collapsed into a pile.
			expand
			duration={3500}
			icons={{
				success: <CircleCheck className="size-4 text-success" />,
				error: <CircleX className="size-4 text-destructive" />,
				warning: <TriangleAlert className="size-4 text-warning" />,
				info: <Info className="size-4 text-muted-foreground" />,
				loading: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
			}}
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						"group/toast pointer-events-auto relative flex w-[360px] items-start gap-2.5 rounded-md border bg-popover p-3 pr-8 font-sans text-[13px] text-popover-foreground",
					icon: "mt-px flex size-4 shrink-0 items-center justify-center",
					content: "min-w-0 flex-1 space-y-0.5",
					title: "leading-snug font-medium",
					description: "line-clamp-4 text-xs leading-relaxed text-muted-foreground select-text",
					actionButton: "ml-2 shrink-0 self-center rounded-sm bg-primary px-2 py-1 text-xs text-primary-foreground",
					cancelButton: "ml-2 shrink-0 self-center rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground",
					closeButton:
						"absolute top-2.5 right-2 left-auto! flex size-5 items-center justify-center rounded-sm border-0! bg-transparent! text-muted-foreground opacity-70 transition-opacity hover:text-foreground hover:opacity-100 [&_svg]:size-3.5",
					error: "border-destructive/30",
				},
			}}
		/>
	);
}
