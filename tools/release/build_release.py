#!/usr/bin/env python3
"""Build one OS-specific BuMoChi ZIP from tracked source and pinned upstream apps."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
TARGETS = {
    'macos-arm64': ('MacOS', 'Electron.app/Contents/MacOS/Electron'),
    'windows-x64': ('Windows', 'XR-Animator_electron-v35.1.2-win32-x64_SA/electron.exe'),
    'linux-x64': ('Linux', 'XR-Animator_electron-v35.1.2-linux-x64_SA/electron'),
}


def extract(source, destination):
    """Extract Unix permissions and relative symlinks, including macOS frameworks."""
    with zipfile.ZipFile(source) as archive:
        for entry in archive.infolist():
            if entry.filename.startswith('__MACOSX/'):
                continue
            path = destination / entry.filename
            if not path.resolve().is_relative_to(destination.resolve()):
                raise ValueError('Unsafe ZIP entry: ' + entry.filename)
            mode = entry.external_attr >> 16
            if entry.is_dir():
                path.mkdir(parents=True, exist_ok=True)
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            if stat.S_ISLNK(mode):
                target = archive.read(entry).decode()
                if not (path.parent / target).resolve().is_relative_to(destination.resolve()):
                    raise ValueError('Unsafe ZIP symlink: ' + entry.filename)
                if path.is_symlink():
                    path.unlink()
                path.symlink_to(target)
            else:
                with archive.open(entry) as src, path.open('wb') as dst:
                    shutil.copyfileobj(src, dst)
                if mode & 0o777:
                    path.chmod(mode & 0o777)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--platform', choices=TARGETS, required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--upstream-zip', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'tools/release/upstream.json').read_text())
    app = manifest[args.platform]
    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='bumochi-release-') as temp:
        temp = Path(temp)
        upstream = args.upstream_zip
        if upstream is None:
            upstream = temp / 'upstream.zip'
            urllib.request.urlretrieve(app['url'], upstream)
        digest = hashlib.file_digest(upstream.open('rb'), 'sha256').hexdigest()
        if digest != app['sha256']:
            raise ValueError('Upstream archive checksum does not match pinned build')
        stage = temp / 'BuMoChi'
        stage.mkdir()
        names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
        for name in filter(None, names):
            if name.startswith(('.github/', 'GodotProjects/', 'tmp/', 'Deprecated/')):
                continue
            src, dst = ROOT / name, stage / name
            if src.is_file() or src.is_symlink():
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst, follow_symlinks=False)
        folder, exe = TARGETS[args.platform]
        bundle = stage / 'XRAnimator/Bin' / folder
        bundle.mkdir(parents=True)
        if args.platform == 'macos-arm64':
            outer = temp / 'mac-upstream'
            outer.mkdir()
            extract(upstream, outer)
            runtime = next(outer.glob('electron-*.zip'))
            extract(runtime, bundle)
            extract(outer / 'XR-Animator_v0.34.3.zip', bundle)
            shutil.copy2(outer / 'readme.txt', bundle / 'UPSTREAM_README.txt')
        else:
            extract(upstream, bundle)
        executable = bundle / exe
        if not executable.is_file():
            raise ValueError('Missing platform executable: ' + str(executable))
        if args.platform != 'windows-x64':
            executable.chmod(executable.stat().st_mode | 0o111)
        (stage / 'RELEASE.json').write_text(json.dumps({
            'version': args.version, 'platform': args.platform,
            'source_commit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'xr_animator': '0.34.3', 'upstream': app,
            'validation': 'macOS launch checked; Windows/Linux require native camera/audio acceptance tests',
        }, indent=2) + '\n')
        out = args.output / f'BuMoChi-{args.version}-{args.platform}.zip'
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for parent, dirs, files in os.walk(stage, followlinks=False):
                for name in files + [d for d in dirs if (Path(parent)/d).is_symlink()]:
                    path = Path(parent) / name
                    relative = path.relative_to(temp).as_posix()
                    if path.is_symlink():
                        info = zipfile.ZipInfo(relative)
                        info.create_system = 3
                        info.external_attr = (stat.S_IFLNK | 0o777) << 16
                        archive.writestr(info, os.readlink(path))
                    else:
                        archive.write(path, relative)
        with zipfile.ZipFile(out) as archive:
            bad = archive.testzip()
            if bad:
                raise ValueError('Bad archive entry: ' + bad)
        checksum = hashlib.file_digest(out.open('rb'), 'sha256').hexdigest()
        out.with_suffix('.zip.sha256').write_text(checksum + '  ' + out.name + '\n')
        print(str(out), out.stat().st_size, checksum)


if __name__ == '__main__':
    main()
