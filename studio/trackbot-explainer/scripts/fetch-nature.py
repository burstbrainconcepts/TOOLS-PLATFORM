"""Download light-weight CC0 nature models from Poly Haven into public/pbr/models/ (for the 3D "park" setting).
Usage: python3 scripts/fetch-nature.py    (needs api.polyhaven.com and dl.polyhaven.org)"""
import importlib.util, os
spec = importlib.util.spec_from_file_location('fp', os.path.join(os.path.dirname(__file__), 'fetch-polyhaven.py'))
fp = importlib.util.module_from_spec(spec); spec.loader.exec_module(fp)
IDS = ['fern_02', 'boulder_01', 'dead_tree_trunk', 'fir_sapling', 'pine_sapling_small', 'dandelion_01', 'periwinkle_plant', 'nettle_plant']
for i in IDS:
    try: fp.model(i)
    except Exception as e: print('FAILED', i, str(e)[:100])
