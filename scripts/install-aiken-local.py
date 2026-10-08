"""Official pinned compiler installer for local/CI tests, never global or wallet-connected."""
import hashlib, pathlib, platform, urllib.request, tarfile, io
version='v1.1.23'
assets={('Darwin','arm64'):('aarch64-apple-darwin','6c03b072a599e1899accf7666c46f2d811d56d4605f9bb097aff38047ce8fa02'),('Linux','x86_64'):('x86_64-unknown-linux-musl','b98c4ccbada5e35f15ba417a52872aeaf0c65998aed77351769ce5fd2506b570')}
key=(platform.system(),platform.machine())
if key not in assets:raise SystemExit('Unsupported platform; no fallback or unpinned install')
arch,digest=assets[key];url=f'https://github.com/aiken-lang/aiken/releases/download/{version}/aiken-{arch}.tar.gz'
with urllib.request.urlopen(url,timeout=30) as r:data=r.read(20000000)
if hashlib.sha256(data).hexdigest()!=digest:raise SystemExit('Compiler archive checksum mismatch')
root=pathlib.Path('.local/aiken');root.mkdir(parents=True,exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(data)) as archive:
 if any(not(m.isfile() or m.isdir()) for m in archive.getmembers()):raise SystemExit('Unexpected link/device in archive')
 archive.extractall(root,filter='data')
print(str(root/f'aiken-{arch}'/'aiken'))
