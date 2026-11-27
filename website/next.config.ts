import type { NextConfig } from "next";

// A static site (out/), so it can be hosted anywhere: GitHub Pages, Vercel, Cloudflare Pages.
// On a GitHub Pages project site, set NEXT_BASE_PATH to "/<repo name>".
const basePath = process.env.NEXT_BASE_PATH || "";

const config: NextConfig = {
	output: "export",
	basePath,
	images: { unoptimized: true },
	env: { NEXT_PUBLIC_BASE_PATH: basePath },
	trailingSlash: true,
	// The site is its own project inside the app's repo (which has its own lockfile one level up).
	turbopack: { root: import.meta.dirname },
	outputFileTracingRoot: import.meta.dirname,
};

export default config;
