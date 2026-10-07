"""Download only verified course banners and build responsive local derivatives."""
import concurrent.futures
import hashlib
import json
import pathlib
import urllib.request
from io import BytesIO
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
verified = json.loads((root / 'src/data/verified-course-images.json').read_text(encoding='utf8'))
out = root / 'public/images/cursos'
out.mkdir(parents=True, exist_ok=True)

def collect(item):
    request = urllib.request.Request(item['origem'], headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=35) as response:
        raw = response.read()
    original = Image.open(BytesIO(raw)).convert('RGB')
    variants = []
    for width in (320, 640, 1280):
        photo = original.copy()
        photo.thumbnail((width, 10000))
        filename = f"{item['id']}-{width}.webp"
        photo.save(out / filename, 'WEBP', quality=78, method=6)
        variants.append({'url': '/images/cursos/' + filename, 'largura': photo.width, 'altura': photo.height, 'bytes': (out / filename).stat().st_size})
    return item['id'], {**item, 'sha256Original': hashlib.sha256(raw).hexdigest(), 'dimensoesOriginal': list(original.size), 'obtidaEm': '2026-10-07', 'variantes': variants}

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    provenance = dict(executor.map(collect, verified))

sources = {}
for cid, item in provenance.items():
    medium = item['variantes'][1]
    candidates = {v['largura']: v['url'] for v in item['variantes']}
    sources[cid] = {'imagem': medium['url'], 'srcSet': ', '.join(f'{url} {w}w' for w, url in candidates.items()), 'largura': medium['largura'], 'altura': medium['altura']}
(root / 'src/lib/image-sources.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2), encoding='utf8')
(out / 'procedencia.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding='utf8')
print('Verified banners:', len(sources), 'Responsive variants:', sum(len(x['variantes']) for x in provenance.values()))
