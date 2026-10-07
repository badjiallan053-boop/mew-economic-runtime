import {baselineProvider,createOpenAIProvider,evaluateProvider} from '../src/evaluation/model.mjs';
const live=process.argv.includes('--live');
if(process.argv.slice(2).some(a=>a!=='--live'))throw new Error('Usage: node scripts/evaluate-model.mjs [--live]');
// Read credentials only after explicit local opt-in; do not load files or print secrets.
const provider=live?createOpenAIProvider({approved:process.env.MEW_APPROVE_MODEL_USAGE==='yes',apiKey:process.env.OPENAI_API_KEY,model:process.env.MEW_EVAL_MODEL}):baselineProvider;
console.log(JSON.stringify(await evaluateProvider(provider,{label:live?'openai-live-fixture-evaluation':'deterministic-abstain-baseline'}),null,2));
