"""Fetch a pinned public safetensors model into ignored local storage."""
import hashlib,json,urllib.request
from pathlib import Path
from huggingface_hub import snapshot_download
model_id='mlx-community/Qwen3-0.6B-4bit'
with urllib.request.urlopen('https://huggingface.co/api/models/'+model_id,timeout=20) as r:metadata=json.loads(r.read(1048576))
revision=metadata['sha']
if len(revision)!=40 or metadata['id']!=model_id or metadata.get('cardData',{}).get('license')!='apache-2.0':raise ValueError('Unverified model identity/license')
path=Path('.local/models/qwen3-0.6b-4bit')
snapshot_download(repo_id=model_id,revision=revision,local_dir=path,allow_patterns=['*.json','*.safetensors','*.txt','LICENSE','README.md'],max_workers=3,token=False)
files={str(f.relative_to(path)):hashlib.sha256(f.read_bytes()).hexdigest() for f in path.iterdir() if f.is_file()}
receipt={'modelId':model_id,'revision':revision,'license':'apache-2.0','files':files,'weightsLocation':str(path),'trustRemoteCode':False,'intendedUse':'local development evaluation only'}
Path('research/learning/local-model-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'modelId':model_id,'revision':revision,'path':str(path)}))
