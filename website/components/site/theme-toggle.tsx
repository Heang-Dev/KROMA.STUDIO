"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Light / dark, remembered (the same `dark` class the app uses). */
export function ThemeToggle() {
	return (
		<Button
			variant="outline"
			size="icon-sm"
			aria-label="Switch light / dark"
			onClick={() => {
				const dark = document.documentElement.classList.toggle("dark");
				try {
					localStorage.setItem("kroma-theme", dark ? "dark" : "light");
				} catch {}
			}}
		>
			<Sun className="dark:hidden" />
			<Moon className="hidden dark:block" />
		</Button>
	);
}
