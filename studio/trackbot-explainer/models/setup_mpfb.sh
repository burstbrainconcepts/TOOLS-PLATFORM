#!/usr/bin/env bash
# One-time setup for models/build_human_mpfb.py: fetches MPFB (MakeHuman plugin for Blender; code GPL-3, assets CC0) and patches the
# handful of Blender-4.2-only calls so it runs on Blender 4.0. Output: $MPFB_HOME (default ~/mpfb-build) containing scripts/addons/mpfb.
# Then:  BLENDER_USER_SCRIPTS=$MPFB_HOME/scripts blender -b -P models/build_human_mpfb.py -- public/models/human_m.glb m
set -euo pipefail
HOME_DIR="${MPFB_HOME:-$HOME/mpfb-build}"
mkdir -p "$HOME_DIR/scripts/addons"
[ -d "$HOME_DIR/src" ] || GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/makehumancommunity/mpfb2 "$HOME_DIR/src"
rm -rf "$HOME_DIR/scripts/addons/mpfb"; cp -r "$HOME_DIR/src/src/mpfb" "$HOME_DIR/scripts/addons/mpfb"
A="$HOME_DIR/scripts/addons/mpfb"
python3 - "$A" <<'PY'
import sys, re, pathlib
a = pathlib.Path(sys.argv[1])
p = a / '__init__.py'; s = p.read_text()
s = s.replace('"blender": (4, 2, 0),', '"blender": (4, 0, 0),', 1).replace('# These are constants that can be imported from submodules', 'bl_info = fake_bl_info\n\n# These are constants that can be imported from submodules', 1)
s = s.replace('if bpy.app.online_access:', 'if getattr(bpy.app, "online_access", False):'); p.write_text(s)
p = a / 'ui' / 'versionpanel.py'; p.write_text(p.read_text().replace('from ..services import LOWEST_FUNCTIONAL_BLENDER_VERSION', 'from ..services.systemservice import LOWEST_FUNCTIONAL_BLENDER_VERSION'))
p = a / 'services' / 'systemservice.py'; p.write_text(p.read_text().replace('LOWEST_FUNCTIONAL_BLENDER_VERSION: tuple[int, int, int] = (4, 2, 0)', 'LOWEST_FUNCTIONAL_BLENDER_VERSION: tuple[int, int, int] = (4, 0, 0)'))
PY
echo "MPFB ready. Build with:"
echo "  BLENDER_USER_SCRIPTS=$HOME_DIR/scripts blender -b -P models/build_human_mpfb.py -- public/models/human_m.glb m   (use f for the female body)"
