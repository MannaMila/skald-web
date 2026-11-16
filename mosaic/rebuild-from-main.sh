#!/usr/bin/env bash
set -euo pipefail

skald_repo=/Volumes/Dev/Code/skald
source_checkout=${SKALD_MOSAIC_SOURCE_CHECKOUT:-}
dry_run=${SKALD_MOSAIC_DRY_RUN:-0}
created_worktree=0
site_root=$(cd "$(dirname "$0")/.." && pwd)
pkg="$skald_repo/build/marketing/ad-source-assets-2026-07-28"
python="$skald_repo/.venv-ad-assets/bin/python"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/skald-mosaic-main.XXXXXX")
cleanup() {
  if [[ "$created_worktree" == 1 ]]; then
    git -C "$skald_repo" worktree remove --force "$scratch/repo" 2>/dev/null || true
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT

if [[ -n "$source_checkout" ]]; then
  source_checkout=$(cd "$source_checkout" && pwd)
else
  git -C "$skald_repo" fetch origin main
  git -C "$skald_repo" worktree add --detach "$scratch/repo" origin/main
  created_worktree=1
  source_checkout="$scratch/repo"
fi
cd "$pkg/sources/tooling"
SKALD_REPO_ROOT="$source_checkout" "$python" refresh_manifest.py
SKALD_REPO_ROOT="$source_checkout" "$python" generate_mosaic_v2.py --skip-png
SKALD_REPO_ROOT="$source_checkout" "$python" ../../mosaic/viewer/build-passages.py
"$python" build_viewer_v2.py

viewer="$pkg/mosaic/viewer"
mkdir "$scratch/site"
rsync -a --exclude='.git' "$site_root/" "$scratch/site/"
staged="$scratch/site/mosaic"
rsync -a --delete "$viewer/tiles-v2/" "$staged/tiles-v2/"
rsync -a "$viewer/screens/" "$staged/screens/"
rsync -a "$viewer/fonts/" "$staged/fonts/"
rsync -a "$viewer/assets/" "$staged/assets/"
cp "$viewer/index-v2.html" "$staged/index.html"
cp "$viewer/art-resolutions.js" "$staged/art-resolutions.js"
node "$staged/generate-art-pages.mjs" --social
(
  cd "$scratch/site"
  node --test
)
# The site is untouched until every test passes. Keep this publish step last.
if [[ "$dry_run" == 1 ]]; then
  echo 'Dry run passed; site tree unchanged.'
else
  rsync -a --delete "$staged/" "$site_root/mosaic/"
fi
