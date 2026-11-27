// Where the installers live, and paths that work under a GitHub Pages base path.

/** The public GitHub repository whose Releases hold the installers. */
export const RELEASES_REPO = process.env.NEXT_PUBLIC_RELEASES_REPO || "Heang-Dev/kroma-studio";
export const RELEASES_URL = `https://github.com/${RELEASES_REPO}/releases`;

/** A file in public/, under the site's base path. */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
