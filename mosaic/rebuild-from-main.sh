#!/usr/bin/env bash
set -euo pipefail

skald_repo=/Volumes/Dev/Code/skald
site_root=$(cd "$(dirname "$0")/.." && pwd)
pkg="$skald_repo/build/marketing/ad-source-assets-2026-07-28"
python="$skald_repo/.venv-ad-assets/bin/python"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/skald-mosaic-main.XXXXXX")
cleanup() {
  git -C "$skald_repo" worktree remove --force "$scratch/repo" 2>/dev/null || true
  rm -rf "$scratch"
}
trap cleanup EXIT

git -C "$skald_repo" fetch origin main
git -C "$skald_repo" worktree add --detach "$scratch/repo" origin/main
cd "$pkg/sources/tooling"
SKALD_REPO_ROOT="$scratch/repo" "$python" refresh_manifest.py
SKALD_REPO_ROOT="$scratch/repo" "$python" generate_mosaic_v2.py --skip-png
SKALD_REPO_ROOT="$scratch/repo" "$python" ../../mosaic/viewer/build-passages.py
"$python" build_viewer_v2.py

viewer="$pkg/mosaic/viewer"
mkdir "$scratch/site"
cp -a "$site_root/mosaic" "$scratch/site/mosaic"
staged="$scratch/site/mosaic"
rsync -a --delete "$viewer/tiles-v2/" "$staged/tiles-v2/"
rsync -a "$viewer/screens/" "$staged/screens/"
rsync -a "$viewer/fonts/" "$staged/fonts/"
rsync -a "$viewer/assets/" "$staged/assets/"
cp "$viewer/index-v2.html" "$staged/index.html"
cp "$viewer/art-resolutions.js" "$staged/art-resolutions.js"
node "$staged/generate-art-pages.mjs" --social --force-social
node --test "$staged/index.test.mjs"
# The site is untouched until every test passes. Keep this publish step last.
rsync -a --delete "$staged/" "$site_root/mosaic/"
