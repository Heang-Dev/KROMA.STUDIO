# Kroma Studio: notes for AI agents

Kroma Studio is an Electron app (this repo) with its website and docs in `website/`. The README covers the stack and the project layout. This file covers releases, and keeping the website in step with the app.

## Where things live

- **This repo** (`Heang-Dev/KROMA.STUDIO`) holds the app source, the website source (`website/`, Next.js static export) and the docs (`website/content/docs/<version>/<en|km>/*.md`).
- **`Heang-Dev/kroma`** (checked out at `../KROMA.WEBSITE`) holds the built output only:
  - its Releases hold the installers the app auto-updates from;
  - its `gh-pages` branch is the live site, https://heang-dev.github.io/kroma/.
  - Never edit `gh-pages` by hand: `bash website/scripts/publish.sh` rebuilds it and force-pushes over it.
- **Version numbers on the site are the app's version.** The site has no version of its own. The footer, the Changelog and the Download page read the app's releases from GitHub when the site is built. The download buttons ask GitHub live in the visitor's browser.

## Releasing a new version

1. Bump `version` in `package.json`, commit, then `git tag vX.Y.Z` and push the tag. CI (`.github/workflows/build.yml`) builds Windows and Linux, runs the tests and a smoke test, and puts the files on a draft release in this repo.
2. Build the Mac app here: `bunx electron-vite build && bunx electron-builder --mac dmg --publish never`. Rename `dist/Kroma Studio-X.Y.Z-arm64.dmg` to `Kroma-Studio-X.Y.Z-arm64.dmg`.
3. Get the Windows and Linux files from the draft: `gh release download vX.Y.Z -R Heang-Dev/KROMA.STUDIO`. This takes about a minute. Don't use `gh run download`: artifact downloads can crawl at ~50 KB/s.
4. Publish on the public repo: `gh release create vX.Y.Z -R Heang-Dev/kroma --latest --title "Kroma Studio X.Y.Z" --notes-file notes.md`, attaching all seven files: the dmg, `Kroma-Studio-Setup-X.Y.Z.exe` and its `.blockmap`, `latest.yml`, the `.AppImage`, the `.deb` and `latest-linux.yml`. The release notes are what users read in the Changelog, so write them for users, not developers.
5. Check `curl -sL https://github.com/Heang-Dev/kroma/releases/latest/download/latest.yml | head -1` shows the new version. Then republish the site with `bash website/scripts/publish.sh`, so the footer, Changelog and Download page show it.

## Keeping the website in step with the app

How much to do depends on which part of the version changed (X.Y.Z = major.minor.patch).

### Patch release (0.1.4 → 0.1.5): no website work

Do the release steps above. The republish in step 5 is all the site needs:
- the new release and its notes appear in the Changelog, the footer and the Download page;
- they also appear on that version's **Release notes** docs page, through its `{{releases}}` placeholder.

Don't rewrite the docs for a patch.

### Minor or major release (0.1.x → 0.2.0, or 0.x → 1.0): review and update the whole site

A new minor or major version gets its own docs version, like Laravel's docs. Before publishing, go through every patch since the last minor (e.g. all of 0.1.0 … 0.1.N) and the new version's changes, then work through this list:

1. **Gather what changed.**
   - Read every release's notes on `Heang-Dev/kroma` since the last minor: `gh release list -R Heang-Dev/kroma`, then `gh release view vX.Y.Z -R Heang-Dev/kroma` for each.
   - Read `git log` for `src/` over the same range. Patch notes are short, and the commits show what they left out.
2. **Start the new docs version.**
   - Copy `website/content/docs/<old>/` to `website/content/docs/<new>/`, e.g. `0.1` → `0.2`.
   - Add the new version first in `website/content/docs/versions.json`, e.g. `{ "version": "0.2", "label": "0.2.x", "released": "YYYY-MM-DD" }`.
   - Leave the old folder as it is: people on older versions still read it, and the site shows them a "you're reading old docs" banner.
3. **Update the new docs** in both `en/` and `km/`, keeping the same page names in both:
   - Every page whose feature changed: labels, defaults, limits, shortcuts, settings, file locations, error messages. Take every fact from the code, never from memory.
   - New features get their own pages or sections. Removed features come out.
   - **Upgrade guide** (`upgrade.md`): what changes for someone moving from the old minor, and anything they must do by hand.
   - **Release notes** (`release-notes.md`): a short summary of the whole minor in the intro, above the `{{releases}}` placeholder. Keep the placeholder; it lists every `X.Y.*` release automatically.
   - Run the link check: every `[text](slug)` and `slug#anchor` must point at a real page and heading, in both languages. Khmer headings get Khmer anchors.
4. **Update the rest of the site** where the app changed:
   - `website/lib/i18n/en.ts` and `km.ts`: home page features, the How it works steps, the FAQ, the Download page text, voice counts.
   - The voice list: run `bun scripts/voice-list.mjs` in `website/` after the app's presets change.
   - Voice samples: run `node scripts/voice-peaks.mjs` after any sample in `website/public/voices/` changes.
   - Screenshots in `website/public/assets/` and `docs/assets/`, when the UI they show has changed.
5. **Update the READMEs.**
   - `README.md`, `docs/readme/README.km.md` and `../KROMA.WEBSITE/README.md`.
   - Their docs links name the version (`/docs/0.1/…`). Point them at the new one.
   - Bring the feature text and screenshots up to date.
6. **Check, then publish.**
   - `bun run typecheck` and `bun run build` in `website/`.
   - Look at a few changed pages in both languages, light and dark, and at phone width (375px). Nothing may be wider than the screen.
   - Publish with `bash website/scripts/publish.sh` after the release is on GitHub, then commit and push this repo and `../KROMA.WEBSITE`.

The site's own links into the docs, such as the Download and Voices pages, follow the latest docs version automatically. Only the READMEs name a version.

## Conventions

- **Site text** lives in `website/lib/i18n/en.ts` and `km.ts`. They share one type, so a missing Khmer string fails `bun run typecheck`.
- **Design tokens** come from `src/renderer/src/tokens.css`, synced to `website/app/tokens.css` by `website/scripts/sync-tokens.mjs`. Kroma's accent is violet `#7F22FE`, the `--brand` token on the site.
- **Testing locally:** after installing a local build into /Applications, reopen the app (`open -a "Kroma Studio"`).
- **Responsible use:** keep the guidance in the app, the docs and the site. Only post videos you have the right to use, and only clone voices with the speaker's permission.
