"""Verify receipt-bound local weights; inspect Safetensors metadata without inference."""
import hashlib, json, pathlib, re, importlib.metadata
from safetensors import safe_open

def verify_model(receipt, repository):
    if receipt.get('trustRemoteCode') is not False or not re.fullmatch(r'[a-f0-9]{40}',receipt.get('revision','')): raise ValueError('Invalid model receipt')
    repository=pathlib.Path(repository).resolve()
    location=pathlib.Path(receipt['weightsLocation'])
    if location.is_absolute() or '..' in location.parts or location.parts[:2]!=('.local','models'): raise ValueError('Model must stay inside local models')
    model=repository/location
    if model.is_symlink() or not model.resolve().is_relative_to(repository/'.local/models'): raise ValueError('Unsafe model location')
    files=receipt.get('files',{})
    if not files or 'model.safetensors' not in files: raise ValueError('Missing weights receipt')
    verified={}
    for name,expected in files.items():
        if pathlib.Path(name).name!=name or name in ('.','..') or not re.fullmatch(r'[a-f0-9]{64}',expected): raise ValueError('Invalid receipt file')
        p=model/name
        if p.is_symlink() or not p.is_file(): raise ValueError('Missing or symlink model file')
        digest=hashlib.sha256()
        with p.open('rb') as f:
            for chunk in iter(lambda:f.read(1024*1024),b''): digest.update(chunk)
        if digest.hexdigest()!=expected: raise ValueError('Model file hash mismatch: '+name)
        verified[name]=expected
    with safe_open(str(model/'model.safetensors'),framework='np') as weights:
        keys=list(weights.keys())
        projections=[{'name':k,'shape':weights.get_slice(k).get_shape()} for k in keys if '.self_attn.' in k and k.endswith('.weight')]
    return {'schema':'mew.local-model-integrity.v1','modelId':receipt['modelId'],'revision':receipt['revision'],'verifiedFiles':verified,'safetensorsVersion':importlib.metadata.version('safetensors'),'tensorCount':len(keys),'attentionWeightMetadata':projections,'tensorValuesChecked':False,'weightsExecuted':False,'trainingAuthorized':False}

if __name__=='__main__':
    receipt_path=pathlib.Path('research/learning/local-model-receipt.json')
    result=verify_model(json.loads(receipt_path.read_text()),pathlib.Path.cwd())
    result['modelReceiptSha256']=hashlib.sha256(receipt_path.read_bytes()).hexdigest()
    pathlib.Path('research/learning/local-model-integrity.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'verifiedFiles':len(result['verifiedFiles']),'tensorCount':result['tensorCount'],'attentionWeights':len(result['attentionWeightMetadata']),'weightsExecuted':False}))
