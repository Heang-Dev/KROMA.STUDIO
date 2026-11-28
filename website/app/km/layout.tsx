import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SHARE_DESCRIPTION, share } from "@/lib/share";

// Link previews for the Khmer pages: the Khmer home page, in Khmer. The Khmer docs set their own.
export const metadata: Metadata = share("km", "home", "Kroma Studio", SHARE_DESCRIPTION.km);

export default function Layout({ children }: { children: ReactNode }) {
	return children;
}
