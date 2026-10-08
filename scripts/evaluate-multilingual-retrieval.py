"""Local ONNX multilingual retrieval; gold spans consulted only after ranking."""
import argparse, hashlib, json, pathlib, time, importlib.metadata, urllib.request, os, subprocess, shutil
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
from huggingface_hub import snapshot_download
p = argparse.ArgumentParser()
p.add_argument('--benchmark', required=True)
p.add_argument('--node', default=shutil.which('node'))
p.add_argument('--run-id', default='')
a = p.parse_args()
d = pathlib.Path(a.benchmark)
sha = lambda b: hashlib.sha256(b).hexdigest()
raw = (d/'benchmark.json').read_bytes()
manifest = json.loads((d/'manifest.json').read_text())
if sha(raw) != manifest['sha256']: raise ValueError('Benchmark hash mismatch')
b = json.loads(raw)
input_raw = (d/'multilingual-ranking-input.json').read_bytes()
r = json.loads(input_raw)
if not a.node: raise ValueError('Node is required for canonical frozen corpus validation; provide --node')
if a.run_id and (not a.run_id.replace('-', '').isalnum() or len(a.run_id)>64): raise ValueError('Invalid run ID')
canonical_process = subprocess.run([a.node, str(pathlib.Path(__file__).with_name('prepare-multilingual-contexts.mjs')), str(d), '--stdout'], check=True, capture_output=True, text=True)
canonical = json.loads(canonical_process.stdout)
if r != canonical: raise ValueError('Ranking input differs from independently regenerated canonical frozen chunks or queries')
if r['benchmarkSha256'] != manifest['sha256'] or r['sourceSnapshotDigest'] != b['sourceSnapshotDigest'] or r['sourceSnapshotDigest'] != manifest['sourceSnapshotDigest']: raise ValueError('Ranking input benchmark mismatch')
if len(r['chunks']) != 58 or len({c['id'] for c in r['chunks']}) != 58: raise ValueError('Frozen comparison requires the same 58 unique chunks')
if any(set(q) != {'id','language','question'} for q in r['queries']): raise ValueError('Labels must not reach ranking')
sources = {s['id']: s for s in b['sources']}
for c in r['chunks']:
    s = sources[c['sourceId']]
    # JavaScript offsets are UTF-16, not Python Unicode code-point offsets.
    if not isinstance(c['start'],int) or not isinstance(c['end'],int) or c['start']<0 or c['end']<=c['start'] or c['end']>len(s['text'].encode('utf-16-le'))//2: raise ValueError('Invalid source offsets')
    text = s['text'].encode('utf-16-le')[c['start']*2:c['end']*2].decode('utf-16-le')
    if text != c['text'] or sha(s['text'].encode()) != c['sourceSha256']: raise ValueError('Source span mismatch')
if r['queries'] != [{k:c[k] for k in ('id','language','question')} for c in b['cases']]: raise ValueError('Query mismatch')
model_id = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
revision = 'e8f8c211226b894fcb81acc59f3b34ba3efd5f42'
with urllib.request.urlopen('https://huggingface.co/api/models/'+model_id+'/revision/'+revision, timeout=30) as response:
    meta = json.load(response)
if meta['sha'] != revision: raise ValueError('Model revision mismatch')
if meta['cardData']['license'] != 'apache-2.0' or len(revision) != 40: raise ValueError('Unapproved metadata')
model_dir = pathlib.Path('.local/models/multilingual-minilm-onnx')
snapshot_download(model_id, revision=revision, local_dir=model_dir, token=False,
    allow_patterns=['onnx/model_qint8_arm64.onnx','tokenizer.json','tokenizer_config.json','sentence_bert_config.json','config.json','1_Pooling/config.json','README.md'], max_workers=3)
config = json.loads((model_dir/'sentence_bert_config.json').read_text())
max_length = config['max_seq_length']
pooling = json.loads((model_dir/'1_Pooling/config.json').read_text())
if not pooling.get('pooling_mode_mean_tokens') or any(pooling.get(k,False) for k in ('pooling_mode_cls_token','pooling_mode_max_tokens','pooling_mode_mean_sqrt_len_tokens')): raise ValueError('Unsupported pooling')
tokenizer = Tokenizer.from_file(str(model_dir/'tokenizer.json'))
tokenizer.no_truncation(); tokenizer.no_padding()
texts = [c['text'] for c in r['chunks']] + [q['question'] for q in r['queries']]
lengths = [len(tokenizer.encode(t).ids) for t in texts]
# Apply the publisher's declared 128-token limit, and track actually encoded offsets.
tokenizer.enable_truncation(max_length=max_length)
visible_lengths=[]
for text in texts:
    encoding=tokenizer.encode(text)
    last=max((end for start,end in encoding.offsets),default=0)
    visible_lengths.append(len(text[:last].encode('utf-16-le'))//2)
tokenizer.enable_padding(pad_id=tokenizer.token_to_id('<pad>'), pad_token='<pad>')
options = ort.SessionOptions(); options.intra_op_num_threads = 2
session = ort.InferenceSession(str(model_dir/'onnx/model_qint8_arm64.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
input_names = {x.name for x in session.get_inputs()}
if not input_names.issubset({'input_ids','attention_mask','token_type_ids'}): raise ValueError('Unexpected model inputs')
embeddings=[]; started=time.monotonic()
for offset in range(0,len(texts),8):
    encoded=tokenizer.encode_batch(texts[offset:offset+8])
    ids=np.array([x.ids for x in encoded],dtype=np.int64)
    mask=np.array([x.attention_mask for x in encoded],dtype=np.int64)
    feeds={'input_ids':ids,'attention_mask':mask,'token_type_ids':np.zeros_like(ids)}
    output=session.run(None,{k:feeds[k] for k in input_names})[0]
    if output.ndim != 3 or output.shape[:2] != ids.shape or output.shape[2] != 384 or not np.isfinite(output).all(): raise ValueError('Unexpected encoder output')
    pooled=(output*mask[:,:,None]).sum(axis=1)/mask.sum(axis=1)[:,None]
    norms=np.linalg.norm(pooled,axis=1,keepdims=True)
    if (norms <= 0).any(): raise ValueError('Zero embeddings')
    embeddings.extend(pooled/norms)
embeddings=np.asarray(embeddings)
chunk_vectors=embeddings[:len(r['chunks'])]; rows=[]
for query,vector in zip(r['queries'],embeddings[len(r['chunks']):]):
    scores=chunk_vectors@vector
    indices=sorted(range(len(scores)),key=lambda i:(-float(scores[i]),r['chunks'][i]['id']))[:3]
    results=[dict(r['chunks'][i],score=float(scores[i]),encoderVisibleEnd=r['chunks'][i]['start']+visible_lengths[i]) for i in indices]
    # Evaluation labels remain unavailable to the ranking function above.
    gold=next(c for c in b['cases'] if c['id']==query['id'])['supportingEvidenceSpans']
    matching=lambda result,span: result['sourceId']==span['sourceId'] and result['start']<=span['start'] and result['end']>=span['end']
    span_rank=next((i for i,result in enumerate(results) if any(matching(result,s) for s in gold)),None)
    rows.append(dict(id=query['id'],language=query['language'],results=results,selectedContexts=[{k:x[k] for k in ('id','sourceId','sourceSha256','start','end','text')} for x in results],sourceHitAt3=any(x['sourceId']==s['sourceId'] for x in results for s in gold),exactSpanHitAt3=span_rank is not None,encoderSpanHitAt3=any(matching(x,s) and x['encoderVisibleEnd']>=s['end'] for x in results for s in gold),exactSpanReciprocalRank=0 if span_rank is None else 1/(span_rank+1),evidenceSpanRecallAt3=sum(any(matching(x,s) for x in results) for s in gold)/len(gold)))
def metrics(language=None):
    selected=[x for x in rows if language is None or x['language']==language]
    return dict(cases=len(selected),sourceHitsAt3=sum(x['sourceHitAt3'] for x in selected),exactSpanHitsAt3=sum(x['exactSpanHitAt3'] for x in selected),encoderSpanHitsAt3=sum(x['encoderSpanHitAt3'] for x in selected),meanEvidenceSpanRecallAt3=sum(x['evidenceSpanRecallAt3'] for x in selected)/len(selected),exactSpanMrrAt3=sum(x['exactSpanReciprocalRank'] for x in selected)/len(selected))
receipt=dict(modelId=model_id,revision=revision,license='apache-2.0',trustRemoteCode=False,weightsIgnored=True,files={str(f.relative_to(model_dir)):sha(f.read_bytes()) for f in model_dir.rglob('*') if f.is_file() and '.cache' not in f.parts},runtime={name:importlib.metadata.version(name) for name in ('onnxruntime','tokenizers','numpy','huggingface_hub')})
report=dict(schema='mew.multilingual-retrieval-evaluation.v1',benchmarkSha256=manifest['sha256'],sourceSnapshotDigest=r['sourceSnapshotDigest'],rankingInputSha256=sha(input_raw),canonicalInputVerified=True,canonicalVerifier='Node frozen benchmark verifier plus paragraphChunks; full input structural equality',offsetUnit=r['offsetUnit'],algorithm='Publisher multilingual MiniLM ARM64 int8 ONNX, masked mean pooling, normalized cosine, top 3',chunkCount=len(r['chunks']),tokenization=dict(maxSequenceLength=max_length,maxObservedTokens=max(lengths),truncatedInputs=sum(n>max_length for n in lengths),truncatedChunks=sum(n>max_length for n in lengths[:len(r['chunks'])]),truncatedQueries=sum(n>max_length for n in lengths[len(r['chunks']):]),fullTokenLengths=lengths,encoderVisibleUtf16Lengths=visible_lengths),elapsedSeconds=time.monotonic()-started,overall=metrics(),byLanguage={l:metrics(l) for l in ('en','fr')},cases=rows,model=receipt,limitations=['Agent-reviewed development diagnostics; no independent customer holdout.','Full-context span coverage and encoder-visible span coverage are reported separately; truncated tails did not influence embeddings.','Embedding coverage does not prove answer faithfulness.','No training, model deployment, payment or external inference.'])
suffix = '-'+a.run_id if a.run_id else ''
with (d/('multilingual-retrieval-evaluation'+suffix+'.json')).open('x') as f: f.write(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
with (d/('multilingual-model-receipt'+suffix+'.json')).open('x') as f: f.write(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ('overall','byLanguage','tokenization','elapsedSeconds')},indent=2))
