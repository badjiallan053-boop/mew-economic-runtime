"""Local base-model run using bound expanded context; no tools or training."""
import os, pathlib, json, hashlib, time, importlib
os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
verify_model=importlib.import_module('verify-local-model').verify_model
root=pathlib.Path('research/learning/frozen-0ab4d24bf6c71ab8');out=root/'parent-base-responses.jsonl'
if out.exists():raise ValueError('Preserve prior run; choose a new experiment, never overwrite')
raw=(root/'benchmark.json').read_bytes();manifest=json.loads((root/'manifest.json').read_text());b=json.loads(raw)
if hashlib.sha256(raw).hexdigest()!=manifest['sha256']:raise ValueError('Benchmark mismatch')
report_raw=(root/'parent-context-evaluation.json').read_bytes();report=json.loads(report_raw);fit=json.loads((root/'parent-context-token-fit.json').read_text())
if report['benchmarkSha256']!=manifest['sha256'] or fit['benchmarkSha256']!=manifest['sha256'] or fit['parentReportSha256']!=hashlib.sha256(report_raw).hexdigest():raise ValueError('Context receipt mismatch')
receipt=json.loads(pathlib.Path('research/learning/local-model-receipt.json').read_text());integrity=verify_model(receipt,pathlib.Path.cwd())
from mlx_lm import load,generate
from mlx_lm.sample_utils import make_sampler
import mlx.core as mx
mx.random.seed(42);model,tokenizer=load(receipt['weightsLocation'],trust_remote_code=False,tokenizer_config={'trust_remote_code':False})
selected=next(r for r in report['runs'] if r['maxParents']==3);queries={c['id']:c for c in b['cases']};sources={s['id']:s for s in b['sources']}
if len(selected['cases'])!=len(queries) or len({c['id'] for c in selected['cases']})!=len(queries):raise ValueError('Incomplete contexts')
with out.open('x') as sink:
 for c in selected['cases']:
  q=queries[c['id']];evidence=[]
  for r in c['contexts']:
   s=sources[r['sourceId']]
   if r['text']!=s['text'] or r['sourceSha256']!=hashlib.sha256(s['text'].encode()).hexdigest():raise ValueError('Source bytes mismatch')
   evidence.append({'id':r['sourceId'],'text':r['text']})
  messages=[{'role':'system','content':fit['systemPrompt']},{'role':'user','content':json.dumps({'question':q['question'],'evidence':evidence},ensure_ascii=False)}]
  prompt=tokenizer.apply_chat_template(messages,tokenize=False,add_generation_prompt=True,enable_thinking=False)
  expected=next(x for x in fit['cases'] if x['id']==c['id'] and x['maxParents']==3)
  if hashlib.sha256(prompt.encode()).hexdigest()!=expected['promptSha256'] or len(tokenizer.encode(prompt))!=expected['inputTokens']:raise ValueError('Renderer drift')
  start=time.monotonic();response=generate(model,tokenizer,prompt=prompt,max_tokens=512,sampler=make_sampler(temp=0),verbose=False)
  row={'id':c['id'],'language':q['language'],'benchmarkSha256':manifest['sha256'],'contextReportSha256':hashlib.sha256(report_raw).hexdigest(),'promptSha256':expected['promptSha256'],'retrievedSourceIds':[e['id'] for e in evidence],'response':response,'inputTokens':expected['inputTokens'],'generationMaxTokens':512,'responseTokenCount':len(tokenizer.encode(response)),'elapsedSeconds':round(time.monotonic()-start,3),'modelRevision':integrity['revision'],'adapterUsed':False,'languageModelInvoked':True,'semanticReview':'pending'}
  sink.write(json.dumps(row,ensure_ascii=False)+'\n');sink.flush();print(json.dumps({'id':row['id'],'elapsedSeconds':row['elapsedSeconds']}),flush=True)
