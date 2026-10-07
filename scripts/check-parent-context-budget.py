"""Token-fit check only: no model loading, training or generation."""
import json, pathlib, hashlib
from transformers import AutoTokenizer
from importlib import import_module
verify_model=import_module("verify-local-model").verify_model
root=pathlib.Path('research/learning/frozen-0ab4d24bf6c71ab8')
report_raw=(root/'parent-context-evaluation.json').read_bytes()
report=json.loads(report_raw)
model=pathlib.Path('.local/models/qwen3-0.6b-4bit')
model_integrity=verify_model(json.loads(pathlib.Path('research/learning/local-model-receipt.json').read_text()),pathlib.Path.cwd())
tokenizer=AutoTokenizer.from_pretrained(str(model),local_files_only=True,trust_remote_code=False)
system='You provide advisory research only. Answer in the language of the question. Use only supplied evidence. If evidence is insufficient, say so. Return exactly one JSON object with answer (string), evidenceRefs (source-ID strings), and authority="advisory-only". Never authorize payments, outreach, model upload or code activation. Cite only supporting sources. No markdown fences.'
benchmark_raw=(root/'benchmark.json').read_bytes()
manifest=json.loads((root/'manifest.json').read_text())
if hashlib.sha256(benchmark_raw).hexdigest()!=manifest['sha256'] or report['benchmarkSha256']!=manifest['sha256']: raise ValueError('Frozen benchmark mismatch')
benchmark=json.loads(benchmark_raw)
if report['sourceSnapshotDigest']!=benchmark['sourceSnapshotDigest'] or benchmark['sourceSnapshotDigest']!=manifest['sourceSnapshotDigest']: raise ValueError('Source snapshot mismatch')
queries={c['id']:c['question'] for c in benchmark['cases']}
rows=[]
for run in report['runs']:
 for c in run['cases']:
  evidence=[{'id':r['sourceId'],'text':r['text']} for r in c['contexts']]
  messages=[{'role':'system','content':system},{'role':'user','content':json.dumps({'question':queries[c['id']],'evidence':evidence},ensure_ascii=False)}]
  rendered=tokenizer.apply_chat_template(messages,tokenize=False,add_generation_prompt=True,enable_thinking=False)
  count=len(tokenizer.encode(rendered,add_special_tokens=False))
  rows.append({'id':c['id'],'maxParents':run['maxParents'],'inputTokens':count,'outputReserveTokens':512,'totalBudgetTokens':8192,'fits':count+512<=8192,'promptSha256':hashlib.sha256(rendered.encode()).hexdigest()})
receipt={'schema':'mew.parent-token-fit.v1','parentReportSha256':hashlib.sha256(report_raw).hexdigest(),'tokenizerFilesSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [model/'tokenizer.json',model/'tokenizer_config.json']},'verifiedModelReceiptRevision':model_integrity['revision'],'benchmarkSha256':manifest['sha256'],'enableThinking':False,'truncationApplied':False,'languageModelInvoked':False,'systemPrompt':system,'cases':rows,'allFit':all(c['fits'] for c in rows),'maxInputTokens':max(c['inputTokens'] for c in rows)}
(root/'parent-context-token-fit.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'allFit':receipt['allFit'],'maxInputTokens':receipt['maxInputTokens'],'outputReserveTokens':512,'budgetTokens':8192}))
if not receipt['allFit']: raise SystemExit('Context exceeds configured budget')
