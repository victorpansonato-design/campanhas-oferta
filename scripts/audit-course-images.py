"""Read-only audit of course photo provenance; output stays in artifacts/."""
import concurrent.futures
import json
import pathlib
import re
import urllib.request
import sys
from io import BytesIO
from html import unescape
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'auditoria-imagens'
OUT.mkdir(parents=True, exist_ok=True)
courses = json.loads((ROOT / 'campanhas-oferta-kit/dados/catalogo-cursos.json').read_text(encoding='utf8'))['cursos']
sources = json.loads((ROOT / 'src/lib/image-sources.json').read_text(encoding='utf8'))
verified = {item['id']: item for item in json.loads((ROOT / 'src/data/verified-course-images.json').read_text(encoding='utf8'))}
sources = {cid: {**source, **verified.get(cid, {})} for cid, source in sources.items()}

def inspect(course):
    source = sources.get(course['id'], {})
    item = {'id': course['id'], 'nome': course['nome'], 'pagina': course['fonteUrl'], 'atual': source}
    try:
        cached = OUT / (course['id'] + '.html')
        if '--offline' in sys.argv and cached.exists():
            item['http'] = 200
            page = cached.read_text(encoding='utf8')
        else:
            request = urllib.request.Request(course['fonteUrl'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=35) as response:
                item['http'] = response.status
                page = response.read().decode('utf8')
        (OUT / (course['id'] + '.html')).write_text(page, encoding='utf8')
        images = list(dict.fromkeys(unescape(url) for url in re.findall(r'https?://[^\s"<>]+?\.(?:jpg|jpeg|png|webp)', page)))
        item['bannersPublicados'] = [url for url in images if 'banner-graduacao' in url]
        item['imagensComSlug'] = [url for url in images if course['id'] in url]
        item['origemAindaPublicada'] = source.get('origem') in images
        item['totalImagensEncontradas'] = len(images)
        backgrounds = re.findall(r'background-image\s*:\s*url\(["\']?(https?://[^)"\']+)', page)
        item['fundosPagina'] = list(dict.fromkeys(url for url in backgrounds if '/uploads/' in url))
        if len(item['fundosPagina']) == 1:
            item['bannerOficial'] = item['fundosPagina'][0]
            item['origemIgualBannerOficial'] = source.get('origem') == item['bannerOficial']
            if '--download' in sys.argv:
                request = urllib.request.Request(item['bannerOficial'], headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(request, timeout=35) as response:
                    raw = response.read()
                photo = Image.open(BytesIO(raw)).convert('RGB')
                item['dimensoesOficiais'] = photo.size
                photo.thumbnail((700, 450))
                photo.save(OUT / (course['id'] + '-oficial.webp'), 'WEBP', quality=82)
    except Exception as error:
        item['erro'] = str(error)
    if item.get('origemIgualBannerOficial'):
        item['classificacao'] = 'banner-ativo-verificado'
    elif not source.get('imagem'):
        item['classificacao'] = 'fallback-administracao-incorreto'
    elif 'ilustrativa' in source.get('tipo', ''):
        item['classificacao'] = 'acervo-generico-sem-correspondencia'
    elif item.get('erro'):
        item['classificacao'] = 'origem-indisponivel-para-validacao'
    elif item.get('origemAindaPublicada'):
        item['classificacao'] = 'banner-publicado-na-pagina-do-curso'
    else:
        item['classificacao'] = 'origem-nao-localizada-na-pagina-atual'
    return item

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    rows = list(executor.map(inspect, courses))

(OUT / 'resultado.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf8')
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
for page in range((len(rows) + 19) // 20):
    sheet = Image.new('RGB', (1200, 1000), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, row in enumerate(rows[page * 20:(page + 1) * 20]):
        x, y = (index % 4) * 300, (index // 4) * 200
        if '--download' in sys.argv:
            file = OUT / (row['id'] + '-oficial.webp')
        else:
            local = row['atual'].get('imagem')
            file = ROOT / 'public' / local.lstrip('/') if local else OUT / (row['id'] + '-ausente.webp')
        if file.exists():
            image = Image.open(file).convert('RGB')
            image.thumbnail((290, 140))
            sheet.paste(image, (x, y))
        draw.text((x + 3, y + 143), row['nome'][:38], font=font, fill='black')
        caption = 'Banner oficial do curso' if '--download' in sys.argv else row['classificacao'][:38]
        draw.text((x + 3, y + 162), caption, font=font, fill='darkgreen' if '--download' in sys.argv else 'darkred')
    suffix = '-oficial' if '--download' in sys.argv else ''
    sheet.save(OUT / f'contato-{page + 1}{suffix}.jpg', quality=88)

from collections import Counter
print(json.dumps({'cursos': len(rows), 'classificacoes': dict(Counter(r['classificacao'] for r in rows)), 'errosHttp': sum('erro' in r for r in rows), 'origensIguaisAoBannerOficial': sum(r.get('origemIgualBannerOficial', False) for r in rows)}, ensure_ascii=True))
