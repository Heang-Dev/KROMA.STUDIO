import * as React from "react";
import { XIcon } from "lucide-react";
import { t } from "@shared/i18n";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// A panel that slides in from the right over the page (shadcn's Sheet on Radix Dialog), with Kroma's look:
// a border, no shadow, a light dimmed backdrop. Esc, the ✕ or a click outside closes it.

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
	return (
		<SheetPrimitive.Portal>
			<SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					"fixed inset-y-0 right-0 z-50 flex h-full w-[440px] max-w-[calc(100vw-3rem)] flex-col border-l bg-background outline-none",
					"data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:duration-200 data-[state=open]:duration-300",
					className,
				)}
				{...props}
			>
				{children}
				<SheetPrimitive.Close className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
					<XIcon className="size-4" />
					<span className="sr-only">{t("Close")}</span>
				</SheetPrimitive.Close>
			</SheetPrimitive.Content>
		</SheetPrimitive.Portal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="sheet-header" className={cn("flex shrink-0 flex-col gap-1 border-b px-5 py-4 pr-12", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-sm font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-[11px] text-muted-foreground", className)} {...props} />;
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription };
