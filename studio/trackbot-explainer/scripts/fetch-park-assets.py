"""Download CC0 park/nature models (Polygonal Mind "MomusPark", listed in the ToxSam open-source-3D-assets registry) into public/env/momuspark/.
Source: https://github.com/ToxSam/open-source-3D-assets (registry) -> raw.githubusercontent.com (files). License: CC0.
Usage: python3 scripts/fetch-park-assets.py"""
import json, os, urllib.request, concurrent.futures as cf
REG = 'https://raw.githubusercontent.com/ToxSam/open-source-3d-assets/main/data/assets/pm-momuspark.json'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'env', 'momuspark')
WANT = ('Tree_0', 'Bush_', 'Flower_', 'Grass_', 'Rock_', 'Log_', 'Root_', 'Path_', 'Bench', 'Fence_', 'Shelter', 'LAND_Floor', 'Terrain_Amount', 'Deer', 'Butterfly', 'Owl', 'Water_Pond', 'Mushroom')
os.makedirs(OUT, exist_ok=True)
reg = json.loads(urllib.request.urlopen(REG, timeout=60).read())
todo = [a for a in reg if a['name'].startswith(WANT)]
def get(a):
    dst = os.path.join(OUT, a['name'].replace('.', '_') + '.glb')
    if os.path.exists(dst) and os.path.getsize(dst) > 1000: return a['name'], 'have'
    try:
        open(dst, 'wb').write(urllib.request.urlopen(a['model_file_url'], timeout=120).read()); return a['name'], 'ok'
    except Exception as e: return a['name'], f'FAILED {e}'
with cf.ThreadPoolExecutor(6) as ex:
    for n, st in ex.map(get, todo): print(st.ljust(8), n)
print(len(os.listdir(OUT)), 'files,', round(sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1e6, 1), 'MB in', os.path.abspath(OUT))
