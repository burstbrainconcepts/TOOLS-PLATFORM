#!/usr/bin/env bash
# Video of a person -> captured motion (skeleton_motion.npz) using VideoIntoBlenderModel (Apache-2.0; MediaPipe, CPU, no GPU, no account).
# Usage: scripts/mocap/extract.sh <video.mp4> <out-dir>            then:  python scripts/mocap/build-clip.py <out-dir>/skeleton_motion.npz <clip-name> [--start S --end E] [--loop]
# One-time setup:  git clone --depth 1 https://github.com/s0ck3t/VideoIntoBlenderModel ~/v2bm ;  pip install mediapipe scipy opencv-python numpy ;  apt install libegl1 libgles2
# (we run it from its folder with PYTHONPATH instead of `pip install -e .`, so none of its build scripts execute). A 10 s clip takes about 5 minutes on 4 CPU cores.
set -euo pipefail
V2BM="${V2BM:-$HOME/v2bm}"; PY="${PY:-python3}"
[ -d "$V2BM" ] || { echo "clone VideoIntoBlenderModel to $V2BM first (see header)"; exit 2; }
mkdir -p "$2"; cd "$V2BM"
PYTHONPATH=. "$PY" -m v2bm.cli run --video "$(realpath "$1")" --rig assets/rigs/humanoid_rig.fbx --no-preview --device cpu --output "$(realpath "$2")"
echo "motion data: $2/skeleton_motion.npz"
