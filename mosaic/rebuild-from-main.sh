#!/usr/bin/env bash
set -euo pipefail

skald_repo=/Volumes/Dev/Code/skald
site_root=$(cd "$(dirname "$0")/.." && pwd)
pkg="$skald_repo/build/marketing/ad-source-assets-2026-07-28"
python="$skald_repo/.venv-ad-assets/bin/python"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/skald-mosaic-main.XXXXXX")
cleanup() {
  git -C "$skald_repo" worktree remove --force "$scratch/repo" 2>/dev/null || true
  rmdir "$scratch" 2>/dev/null || true
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
rsync -a --delete "$viewer/tiles-v2/" "$site_root/mosaic/tiles-v2/"
rsync -a "$viewer/screens/" "$site_root/mosaic/screens/"
rsync -a "$viewer/fonts/" "$site_root/mosaic/fonts/"
rsync -a "$viewer/assets/" "$site_root/mosaic/assets/"
cp "$viewer/index-v2.html" "$site_root/mosaic/index.html"
cd "$site_root"
node mosaic/generate-art-pages.mjs --social --force-social
node --test --test-name-pattern='Greek library' mosaic/index.test.mjs
