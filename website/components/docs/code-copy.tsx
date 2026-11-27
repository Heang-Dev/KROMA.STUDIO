"use client";

import { useEffect } from "react";

/** Adds a Copy button to every code block in the docs page. */
export function CodeCopy({ copy, copied }: { copy: string; copied: string }) {
	useEffect(() => {
		const blocks = document.querySelectorAll<HTMLElement>(".docs-prose .code-block");
		for (const block of blocks) {
			if (block.querySelector("button")) continue;
			const button = document.createElement("button");
			button.type = "button";
			button.className = "copy-button";
			button.textContent = copy;
			button.addEventListener("click", () => {
				void navigator.clipboard.writeText(block.querySelector("code")?.textContent ?? "").then(() => {
					button.textContent = copied;
					setTimeout(() => (button.textContent = copy), 1500);
				});
			});
			block.appendChild(button);
		}
	}, [copy, copied]);
	return null;
}
