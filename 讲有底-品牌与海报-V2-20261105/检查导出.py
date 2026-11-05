"""读取PNG头及本地链接，生成交付清单；不修改图片。"""
from pathlib import Path
import struct
import hashlib
import json
import re
from datetime import datetime, timezone, timedelta

root = Path(__file__).resolve().parent
exports = []
for path in sorted((root / '海报').glob('*.png')):
    raw = path.read_bytes()
    assert raw[:8] == b'\x89PNG\r\n\x1a\n', path.name
    width, height = struct.unpack('>II', raw[16:24])
    expected = (2160, 3840) if '-2160x3840' in path.stem else (1080, 1920)
    assert (width, height) == expected, (path.name, width, height)
    assert width * 16 == height * 9, path.name
    exports.append({'file': path.relative_to(root).as_posix(), 'width': width,
                    'height': height, 'aspect_ratio': '9:16', 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest()})
assert len(exports) == 8, f'Expected 8 exports, got {len(exports)}'

assets = []
for path in sorted((root / '素材').glob('*.png')):
    raw = path.read_bytes()
    width, height = struct.unpack('>II', raw[16:24])
    assets.append({'file': path.relative_to(root).as_posix(), 'native_width': width,
                   'native_height': height, 'bytes': len(raw),
                   'source': 'built-in ImageGen', 'role': 'concept key visual',
                   'sha256': hashlib.sha256(raw).hexdigest()})
assert len(assets) == 4

missing = []
references = set()
for file in ['打开新版海报.html', '海报排版源.html']:
    text = (root / file).read_text(encoding='utf-8')
    for ref in re.findall(r'(?:src|href)="([^"]+)"', text):
        if ref.startswith(('http:', 'https:', 'data:', '#')) or ref == 'export-manifest.json':
            continue
        references.add(ref)
        if not (root / ref.split('?')[0]).is_file():
            missing.append({'from': file, 'reference': ref})
assert not missing, missing

manifest = {
    'brand': '讲有底', 'edition': 'V2',
    'verified_at': datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),
    'export_method': 'Chromium HTML/CSS screenshot; CSS artboard 1080x1920; device scale 2 for high resolution; CSS scale for social',
    'font': 'Microsoft YaHei, installed Windows font; font files not redistributed',
    'provenance': 'ImageGen key visuals plus independently rendered exact Chinese copy and illustrative device UI',
    'native_4k_photo_claim': False,
    'exports': exports, 'assets': assets,
    'local_reference_count': len(references), 'missing_local_references': missing,
    'notes': 'Scenarios and UI are advertising concepts. Naming is a recommendation with web screening; no trademark, domain or account clearance claimed.'
}
(root / 'export-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'exports': len(exports), 'all_exact_9_16': True, 'assets': len(assets),
                  'missing_references': len(missing),
                  'total_export_bytes': sum(e['bytes'] for e in exports)}, ensure_ascii=False))
