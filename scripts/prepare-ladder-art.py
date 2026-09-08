"""Remove only border-connected near-black background from supplied badge copies."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import hashlib
import json
import sys

source, target = map(Path, sys.argv[1:3])
target.mkdir(parents=True, exist_ok=True)
records = []
for value in (50, 100, 200, 300, 500, 1000, 2000, 3000):
    path = source / f'{value}.png'
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    original = Image.open(path).convert('RGBA')
    r, g, b, old_alpha = original.split()
    eligible = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda x: 255 if x < 32 else 0)
    ImageDraw.floodfill(eligible, (0, 0), 128, thresh=0)
    alpha = ImageChops.multiply(old_alpha, eligible.point(lambda x: 0 if x == 128 else 255))
    original.putalpha(alpha)
    destination = target / path.name
    original.save(destination)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before
    records.append({'file':path.name, 'sourceSha256':before, 'outputSha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
(target / 'provenance.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(f'{len(records)} transparent copies saved; all source hashes unchanged')
