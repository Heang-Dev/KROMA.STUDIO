#!/usr/bin/env bash
# Publishes the website to GitHub Pages: https://heang-dev.github.io/kroma/
# It builds the static site for that address and pushes it to the gh-pages branch of the public repo
# Heang-Dev/kroma (which also holds the installers in its Releases; the app's code stays private).
# Usage: bash website/scripts/publish.sh
set -euo pipefail
REPO="Heang-Dev/kroma"
cd "$(dirname "$0")/.."
NEXT_BASE_PATH=/kroma NEXT_PUBLIC_SITE_URL=https://heang-dev.github.io/kroma/ bun run build
touch out/.nojekyll   # GitHub Pages must serve the _next/ folder as is
work=$(mktemp -d)
cp -R out/. "$work/"
cd "$work"
git init -q -b gh-pages
git add -A
git -c user.name="Kroma Studio" -c user.email="Heang-Dev@users.noreply.github.com" commit -q -m "Website $(date -u +%Y-%m-%d)"
git push -q -f "https://github.com/$REPO.git" gh-pages
rm -rf "$work"
echo "Published: https://heang-dev.github.io/kroma/ (live in a minute or two)"
