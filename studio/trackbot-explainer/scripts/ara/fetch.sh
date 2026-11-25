#!/usr/bin/env bash
# Builds an Ara 3D Gen character GLB with all 259 animation clips into public/models/ara/<name>.glb (git-ignored, about 30 MB each).
# Usage: scripts/ara/fetch.sh "The Chef" chef      (preset names: see `... presets`; or pass --params file via ARA_ARGS)
# One-time: git clone --depth 1 https://github.com/olatunde85/3d-gen ~/3d-gen && (cd ~/3d-gen && npm ci --ignore-scripts)
set -euo pipefail
ARA="${ARA:-$HOME/3d-gen}"; HERE="$(pwd)"; OUT="$(mktemp -d)"
(cd "$ARA" && npx tsx packages/cli/src/cli.ts export --preset "$1" --detail "${DETAIL:-medium}" --out "$OUT" ${ARA_ARGS:-})
mkdir -p "$HERE/public/models/ara"; mv "$OUT"/*.glb "$HERE/public/models/ara/$2.glb"; echo "wrote public/models/ara/$2.glb"
