#!/usr/bin/env bash
# Installs Rhubarb Lip Sync 1.14.0 (MIT, CPU, no GPU) for phoneme-based mouth shapes: scripts/lib/voice.mjs calls it when found.
# Default location: ~/rhubarb-bin/Rhubarb-Lip-Sync-1.14.0-Linux/rhubarb (override with the RHUBARB env var). Needs github.com release access.
set -euo pipefail
D="${1:-$HOME/rhubarb-bin}"; mkdir -p "$D"; cd "$D"
curl -sL -o rb.zip "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-Linux.zip"
unzip -q -o rb.zip && echo "installed: $D/Rhubarb-Lip-Sync-1.14.0-Linux/rhubarb"
