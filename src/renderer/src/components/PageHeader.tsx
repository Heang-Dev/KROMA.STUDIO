import type { ReactNode } from "react";

/**
 * The bar at the top of every full page (Voices, Story, Downloads; Settings has the same height with its breadcrumb):
 * 48 px, a border under it, the page's icon and title on the left with an optional short description, and the page's
 * own controls on the right (all one control height). One header for every page, so they read as one app.
 */
export function PageHeader({ icon, title, description, children, actions }: { icon: ReactNode; title: ReactNode; description?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
	return (
		<header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
			<h1 className="flex shrink-0 items-center gap-2 text-[13px] font-semibold [&_svg]:size-4">
				{icon}
				{title}
			</h1>
			{description && <p className="hidden min-w-0 truncate text-xs text-muted-foreground lg:block">{description}</p>}
			{children}
			<span className="flex-1" />
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</header>
	);
}

/** A titled block of content on a full page: the same look as the settings groups (title, one line of help, content). */
export function PageSection({ icon, title, description, action, children }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
	return (
		<section className="space-y-2.5">
			<div className="flex items-end justify-between gap-3 px-0.5">
				<div className="min-w-0 space-y-1">
					<h2 className="flex items-center gap-2 text-[13px] leading-tight font-semibold [&_svg]:size-4">
						{icon}
						{title}
					</h2>
					{description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
				</div>
				{action && <div className="shrink-0">{action}</div>}
			</div>
			{children}
		</section>
	);
}
