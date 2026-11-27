import { cn } from "@/lib/utils";
import { asset } from "@/lib/site";

/**
 * An app screenshot framed like its window. The screenshots are the app's own title bar (macOS draws the window
 * buttons outside the page), so the three dots go back where they sit: 16px in from the corner of a 1600px window.
 */
export function WindowShot({ src, srcLight, alt, priority, className }: { src: string; srcLight?: string; alt: string; priority?: boolean; className?: string }) {
	return (
		<figure className={cn("relative m-0 overflow-hidden rounded-[10px] bg-card shadow-[0_30px_80px_-30px_rgb(0_0_0/0.25),0_0_0_1px_var(--border)] dark:shadow-[0_30px_90px_-20px_rgb(0_0_0/0.8),0_0_0_1px_var(--border)]", className)}>
			<div aria-hidden className="absolute top-[1.15%] left-[1.05%] flex w-[6%] gap-[0.5%]">
				<span className="aspect-square w-[12.5%] rounded-full bg-[#ff5f57]" />
				<span className="aspect-square w-[12.5%] rounded-full bg-[#febc2e]" />
				<span className="aspect-square w-[12.5%] rounded-full bg-[#28c840]" />
			</div>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={asset(src)} alt={alt} width={2400} height={1500} loading={priority ? "eager" : "lazy"} className={cn("block h-auto w-full", srcLight && "hidden dark:block")} />
			{srcLight && (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={asset(srcLight)} alt={alt} width={2400} height={1500} loading="lazy" className="block h-auto w-full dark:hidden" />
			)}
		</figure>
	);
}
