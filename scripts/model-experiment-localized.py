"""Twelve offline localized-prompt generations; preserve all prior experiments."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import argparse, hashlib, importlib, json, pathlib, time
from datetime import datetime, timezone
from importlib.metadata import version
from itertools import combinations

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def write_new(path, value):
    with path.open('x', encoding='utf-8') as file:
        file.write(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output')
    args = parser.parse_args()
    repository = pathlib.Path.cwd().resolve()
    output = (repository / args.output).resolve()
    allowed = repository / 'research/experiments'
    if not output.is_relative_to(allowed) or output == allowed or output.exists():
        raise ValueError('Use a fresh child experiment; never overwrite')
    prior = repository / 'research/experiments/prompt-grounding-language-2026-10-08'
    prior_policy_raw = (prior / 'policy.json').read_bytes()
    prior_policy = json.loads(prior_policy_raw)
    prior_completion_raw = (prior / 'completion.json').read_bytes()
    prior_completion = json.loads(prior_completion_raw)
    base_script_raw = (repository / 'scripts/model-experiment-local.py').read_bytes()
    if prior_policy['generationScriptSha256'] != sha(base_script_raw) or prior_completion['policySha256'] != sha(prior_policy_raw):
        raise ValueError('Prior runner/policy changed')
    baseline_request_raw = (prior / 'baseline-requests.jsonl').read_bytes()
    baseline_response_raw = (prior / 'baseline-responses.jsonl').read_bytes()
    if prior_completion['requestsFiles']['baseline'] != sha(baseline_request_raw) or prior_completion['responseFiles']['baseline'] != sha(baseline_response_raw):
        raise ValueError('Prior baseline changed')
    baseline_requests = [json.loads(line) for line in baseline_request_raw.splitlines()]
    frozen = repository / 'research/learning/frozen-0ab4d24bf6c71ab8'
    benchmark_raw = (frozen / 'benchmark.json').read_bytes()
    benchmark = json.loads(benchmark_raw)
    manifest = json.loads((frozen / 'manifest.json').read_text())
    if sha(benchmark_raw) != manifest['sha256'] or prior_policy['benchmarkSha256'] != manifest['sha256']:
        raise ValueError('Frozen benchmark changed')
    receipt_raw = (repository / 'research/learning/local-model-receipt.json').read_bytes()
    receipt = json.loads(receipt_raw)
    integrity = importlib.import_module('verify-local-model').verify_model(receipt, repository)
    versions = {name: version(name) for name in ['mlx', 'mlx-lm', 'outlines', 'outlines_core', 'transformers', 'safetensors']}
    if versions != prior_policy['versions'] or integrity['revision'] != prior_policy['modelRevision'] or sha(receipt_raw) != prior_policy['modelReceiptSha256']:
        raise ValueError('Model or environment changed')
    prompts_raw = (repository / 'src/learning/model-experiment-localized-prompts.json').read_bytes()
    prompts = json.loads(prompts_raw)
    if set(prompts) != {'en','fr'} or any(not isinstance(value,str) or not value for value in prompts.values()):
        raise ValueError('Expected original English/French system instructions')
    from mlx_lm import load
    from mlx_lm.sample_utils import make_sampler
    import mlx.core as mx
    import outlines
    model, tokenizer = load(str(repository / receipt['weightsLocation']), trust_remote_code=False, tokenizer_config={'trust_remote_code': False})
    wrapped = outlines.from_mlxlm(model, tokenizer)
    wrapped.type_adapter.has_chat_template = False
    mx.random.seed(42)
    policy = {**prior_policy, 'schema':'mew.localized-model-experiment-policy.v1', 'changedVariable':'localizedSystemPrompt', 'variants':prompts, 'variantOrder':['localized'], 'baselinePolicySha256':sha(prior_policy_raw), 'baselineCompletionSha256':sha(prior_completion_raw), 'baselineRequestsSha256':sha(baseline_request_raw), 'baselineResponsesSha256':sha(baseline_response_raw), 'baseRunnerSha256':sha(base_script_raw), 'generationScriptSha256':sha(pathlib.Path(__file__).read_bytes()), 'localizedPromptsSha256':sha(prompts_raw), 'localeSource':'frozen question.language only; no gold criteria or spans', 'modelIntegrity':integrity, 'observedAt':datetime.now(timezone.utc).isoformat()}
    output.mkdir(parents=True, mode=0o700)
    write_new(output / 'policy.json',policy)
    policy_sha = sha((output / 'policy.json').read_bytes())
    labels = {case['id']:case for case in benchmark['cases']}
    if len(baseline_requests) != len(labels) or len({r['id'] for r in baseline_requests}) != len(labels):
        raise ValueError('Incomplete baseline')
    with (output / 'localized-requests.jsonl').open('x') as requests, (output / 'localized-responses.jsonl').open('x') as responses:
        for baseline in baseline_requests:
            label = labels[baseline['id']]
            if set(baseline['userInput']) != {'question','evidence'} or baseline['userInput']['question'] != label['question']:
                raise ValueError('Unexpected request fields')
            # Canonical receipts sort keys; reconstruct the original renderer order.
            user_input = {'question':baseline['userInput']['question'],'evidence':baseline['userInput']['evidence']}
            prompt = tokenizer.apply_chat_template([{'role':'system','content':prompts[label['language']]},{'role':'user','content':json.dumps(user_input,ensure_ascii=False)}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
            input_tokens = len(tokenizer.encode(prompt))
            if input_tokens + 512 > 8192 or wrapped.type_adapter.format_input(prompt) != prompt or baseline['renderedPrompt'].replace(prior_policy['variants']['baseline'],prompts[label['language']],1) != prompt:
                raise ValueError('Renderer or token drift')
            request = {**baseline, 'variant':'localized','locale':label['language'],'systemPrompt':prompts[label['language']], 'renderedPrompt':prompt,'promptSha256':sha(prompt.encode()),'inputTokens':input_tokens,'policySha256':policy_sha}
            request_json = canonical(request)
            requests.write(request_json+'\n');requests.flush()
            generator = outlines.Generator(wrapped,outlines.types.JsonSchema(request['outputSchema']))
            start=time.monotonic()
            response=generator(prompt,max_tokens=512,sampler=make_sampler(temp=0),verbose=False)
            row={'schema':'mew.model-experiment-response.v1','id':label['id'],'variant':'localized','language':label['language'],'requestSha256':sha(request_json.encode()),'promptSha256':request['promptSha256'],'policySha256':policy_sha,'response':response,'responseTokenCount':len(tokenizer.encode(response)),'elapsedSeconds':round(time.monotonic()-start,3),'modelRevision':integrity['revision'],'languageModelInvoked':True,'semanticReview':'pending','generationScriptSha256':policy['generationScriptSha256']}
            responses.write(canonical(row)+'\n');responses.flush()
            print(json.dumps({'variant':'localized','id':row['id'],'elapsedSeconds':row['elapsedSeconds']}),flush=True)
    write_new(output/'completion.json',{'schema':'mew.model-experiment-completion.v1','policySha256':policy_sha,'observedAt':datetime.now(timezone.utc).isoformat(),'responseFiles':{'localized':sha((output/'localized-responses.jsonl').read_bytes())},'requestsFiles':{'localized':sha((output/'localized-requests.jsonl').read_bytes())},'modelActivationAllowed':False,'trainingAuthorized':False,'paymentsEnabled':False})

if __name__ == '__main__':
    main()
