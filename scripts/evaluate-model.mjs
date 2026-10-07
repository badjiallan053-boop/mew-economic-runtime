import {baselineProvider,createOpenAIProvider,evaluateProvider,evaluateCompactWorkflow} from '../src/evaluation/model.mjs';
const live=process.argv.includes('--live'),workflow=process.argv.includes('--workflow');
if(process.argv.slice(2).some(a=>!['--live','--workflow'].includes(a)))throw new Error('Usage: node scripts/evaluate-model.mjs [--live] [--workflow]');
// Read credentials only after explicit local opt-in; do not load files or print secrets.
const provider=live?createOpenAIProvider({approved:process.env.MEW_APPROVE_MODEL_USAGE==='yes',apiKey:process.env.OPENAI_API_KEY,model:process.env.MEW_EVAL_MODEL,maxCalls:workflow?6:4,evaluationScope:workflow?'compact-workflow':'first-task'}):baselineProvider;
console.log(JSON.stringify(await (workflow?evaluateCompactWorkflow(provider):evaluateProvider(provider,{label:live?'openai-live-fixture-evaluation':'deterministic-abstain-baseline'})),null,2));
