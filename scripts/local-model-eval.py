"""Offline Qwen development evaluation. No uploads, payment tools or policy activation."""
import argparse, hashlib, json, time
import os
os.environ["HF_HUB_OFFLINE"]="1"
os.environ["TRANSFORMERS_OFFLINE"]="1"
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--model',required=True)
parser.add_argument('--benchmark',required=True)
parser.add_argument('--adapter')
parser.add_argument('--variant',choices=['base','prompt-v2'],default='base')
args=parser.parse_args()
folder=Path(args.benchmark)
raw=(folder/'benchmark.json').read_bytes()
manifest=json.loads((folder/'manifest.json').read_text())
if hashlib.sha256(raw).hexdigest()!=manifest['sha256']:raise ValueError('Frozen benchmark changed')
benchmark=json.loads(raw)
retrieval=json.loads((folder/'retrieval-evaluation.json').read_text())
if retrieval['benchmarkSha256']!=manifest['sha256']:raise ValueError('Retrieval uses different benchmark')
from mlx_lm import load, generate
from mlx_lm.sample_utils import make_sampler
import mlx.core as mx
mx.random.seed(42)
model,tokenizer=load(args.model,adapter_path=args.adapter,trust_remote_code=False,tokenizer_config={"trust_remote_code":False})
source_map={s['id']:s for s in benchmark['sources']}
ranked={c['id']:c['results'] for c in retrieval['cases']}
output=folder/('adapter-responses.jsonl' if args.adapter else args.variant+'-responses.jsonl')
max_tokens=512 if args.variant=='prompt-v2' else 256
if output.exists():raise ValueError('Evaluation output already exists; use a new experiment directory')
with output.open('x') as sink:
 for case in benchmark['cases']:
  evidence=[{'id':r['id'],'text':source_map[r['id']]['text'][:(16000 if args.variant=='prompt-v2' else 4000)]} for r in ranked[case['id']]]
  messages=[{'role':'system','content':'You provide advisory research only. Answer in the language of the question. Use only supplied evidence. If evidence is insufficient, say so. Return JSON with answer, evidenceRefs (source IDs), and authority="advisory-only". Never authorize payments, outreach, model upload or code activation.'},{'role':'user','content':json.dumps({'question':case['question'],'evidence':evidence},ensure_ascii=False)}]
  if args.variant=='prompt-v2':
   messages[0]['content']+=' Output exactly one JSON object, without markdown fences. Required types: answer is a concise string, evidenceRefs is an array of source-ID strings (never objects or copied text), authority is the literal string advisory-only. Do not output question or evidence fields. Cite only sources that support your answer. If none support it, explicitly say evidence is insufficient and use an empty evidenceRefs array. Answer in French for a French question, English for an English question. Limit the answer to 80 words.'
  prompt=tokenizer.apply_chat_template(messages,tokenize=False,add_generation_prompt=True,enable_thinking=False)
  start=time.monotonic();response=generate(model,tokenizer,prompt=prompt,max_tokens=max_tokens,sampler=make_sampler(temp=0),verbose=False)
  try:
   parsed=json.loads(response);valid=isinstance(parsed,dict) and parsed.get('authority')=='advisory-only' and isinstance(parsed.get('answer'),str) and bool(parsed['answer'].strip()) and isinstance(parsed.get('evidenceRefs'),list) and all(ref in [e['id'] for e in evidence] for ref in parsed['evidenceRefs'])
  except (ValueError,TypeError):valid=False
  row={'id':case['id'],'language':case['language'],'modelPath':args.model,'adapterUsed':bool(args.adapter),'benchmarkSha256':manifest['sha256'],'retrievedSourceIds':[e['id'] for e in evidence],'response':response,'jsonContractValid':valid,'elapsedSeconds':round(time.monotonic()-start,3),'evidenceSha256':hashlib.sha256(json.dumps(evidence,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),'expectedSpanPresent':any(span['quote'] in e['text'] and span['sourceId']==e['id'] for span in case['supportingEvidenceSpans'] for e in evidence),'responseTokenCount':len(tokenizer.encode(response)),'generationMaxTokens':max_tokens,'variant':args.variant,'semanticReview':'pending','languageModelInvoked':True}
  sink.write(json.dumps(row,ensure_ascii=False)+'\n');sink.flush();print(json.dumps({'id':case['id'],'jsonContractValid':valid,'elapsedSeconds':row['elapsedSeconds']}),flush=True)
