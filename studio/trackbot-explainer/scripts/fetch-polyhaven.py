"""Download the CC0 Poly Haven assets used by the 3D scenes into public/pbr/.
Run from studio/trackbot-explainer:  python3 scripts/fetch-polyhaven.py
Needs network access to api.polyhaven.com and dl.polyhaven.org. All assets are CC0 (https://polyhaven.com/license).
"""
import json, os, urllib.request

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'pbr')
API = 'https://api.polyhaven.com/files/'
UA = {'User-Agent': 'video-pipeline-asset-fetch'}


def get(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        d = r.read()
    return d if binary else json.loads(d)


def save(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(get(url, True))
    print('saved', os.path.relpath(path, OUT), os.path.getsize(path) // 1024, 'KB')


def hdri(name, res='1k'):
    save(get(API + name)['hdri'][res]['hdr']['url'], os.path.join(OUT, 'hdri', f'{name}_{res}.hdr'))


def texture(name, res='1k'):
    f = get(API + name)
    for key, short in (('Diffuse', 'diff'), ('Rough', 'rough'), ('nor_gl', 'nor')):
        save(f[key][res]['jpg']['url'], os.path.join(OUT, name, f'{short}.jpg'))


def model(name, res='1k'):
    f = get(API + name)['gltf'][res]['gltf']
    base = os.path.join(OUT, 'models', name)
    save(f['url'], os.path.join(base, f'{name}_{res}.gltf'))
    for rel, v in f['include'].items():
        save(v['url'], os.path.join(base, rel))


if __name__ == '__main__':
    hdri('venice_sunset')
    texture('asphalt_02')
    texture('concrete_pavement')
    model('street_lamp_01')
    model('fire_hydrant')
    open(os.path.join(OUT, 'CREDITS.md'), 'w').write(
        '# Third-party assets\n\nAll files in this folder are CC0 (public domain) from Poly Haven (https://polyhaven.com):\n'
        '- HDRI `venice_sunset` (1k)\n- Texture `asphalt_02` (1k diffuse/roughness/normal)\n- Texture `concrete_pavement` (1k diffuse/roughness/normal)\n- Models `street_lamp_01`, `fire_hydrant` (1k glTF)\n\n'
        'License: https://polyhaven.com/license\n')
