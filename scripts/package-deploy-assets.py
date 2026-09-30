"""Package tracked, unmodified LFS assets for this repository's deployment release.

No media transformation is performed. Run from the repository root after pulling
all LFS objects; upload the archive before committing the generated manifest.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tag', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if not all(c.isalnum() or c in '-_.' for c in args.tag):
        raise ValueError('Invalid release tag')
    output = Path(args.output).resolve()
    if output.exists():
        raise ValueError('Archive already exists; use a new release name')
    files = json.loads(subprocess.check_output(['git', 'lfs', 'ls-files', '--json']))['files']
    records = []
    for item in files:
        path = Path(item['name'])
        if not item['name'].startswith('assets/') or '..' in path.parts or path.is_symlink():
            raise ValueError('Unexpected asset path: ' + str(path))
        if path.stat().st_size != item['size'] or sha256(path) != item['oid']:
            raise ValueError('Missing or modified LFS content: ' + str(path))
        records.append({'path': item['name'], 'size': item['size'], 'sha256': item['oid']})
    with tarfile.open(output, 'w:gz', compresslevel=6, format=tarfile.USTAR_FORMAT) as archive:
        for record in records:
            path = Path(record['path'])
            info = archive.gettarinfo(str(path), arcname=record['path'])
            info.mtime = info.uid = info.gid = 0
            info.uname = info.gname = ''
            info.mode = 0o644
            with path.open('rb') as stream:
                archive.addfile(info, stream)
    if output.stat().st_size >= 2 * 1024**3:
        raise ValueError('Release asset exceeds 2 GiB')
    manifest = {'version': 1, 'archive': {
        'url': f'https://github.com/ntriziinfo/nova/releases/download/{args.tag}/{output.name}',
        'size': output.stat().st_size, 'sha256': sha256(output)
    }, 'files': records}
    Path('deploy-assets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'files': len(records), 'archive': str(output), 'bytes': output.stat().st_size}))


if __name__ == '__main__':
    main()
