# Notes for AI agents

Read [CLAUDE.md](CLAUDE.md). It covers how to release Kroma Studio and when the website and docs must be updated:

- **Every release** (patch, minor or major) updates the changelog, **first**: add the version's section to `CHANGELOG.md` before bumping and tagging, use that section as the GitHub release notes, then republish the site so the Changelog shows it.
- **Minor or major releases** (0.1.x → 0.2.0) also update the docs: a new docs version and a review of every patch since the last minor, carried into the docs, site text and READMEs. Patches never change the docs.
