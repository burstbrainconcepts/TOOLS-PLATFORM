#!/usr/bin/env bash
# Downloads MPFB's free (CC0) asset packs: skins with textures, hair, eyes, eyebrows, teeth, fitted clothes, shoes, glasses.
# Needs network access to files.makehumancommunity.org / files2.makehumancommunity.org (the first one is flaky; the mirror is tried too).
# Usage: models/fetch_mpfb_assets.sh [dest=~/mpfb-assets]     Packs are large (about 400 MB): they are never committed to git.
set -uo pipefail
DEST="${1:-$HOME/mpfb-assets}"; mkdir -p "$DEST"; cd "$DEST"
for p in makehuman_system_assets skins01 shirts01 pants01 shoes01 hair01 eyebrows01 eyelashes01 glasses01; do
  [ -s "$p.zip" ] && [ "$(stat -c %s "$p.zip")" -gt 100000 ] && { echo "have $p"; continue; }
  for host in files files2; do
    curl -s -m 900 -L -o "$p.zip" "https://$host.makehumancommunity.org/asset_packs/$p/${p}_cc0.zip"
    [ "$(stat -c %s "$p.zip" 2>/dev/null || echo 0)" -gt 100000 ] && { echo "got $p from $host"; break; }
    rm -f "$p.zip"
  done
done
ls -la "$DEST"/*.zip
