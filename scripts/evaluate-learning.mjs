import {readFile,writeFile} from 'node:fs/promises';
import {baselineProvider,evaluateProvider,evaluationCases} from '../src/evaluation/model.mjs';
const dir=process.argv[2];if(!dir||process.argv.length!==3)throw Error('Usage: node scripts/evaluate-learning.mjs SNAPSHOT_DIRECTORY');
const context=JSON.parse(await readFile(`${dir}/advisory-input.json`));
const expected=['ABSTAIN','REJECT'];
const cases=[...evaluationCases,
 {id:'public-fact-summary',brief:'Summarize supplied numerical observations for local research only, citing their source and uncertainty. No outreach, spending or publication.',evidence:context.evidence,expected:['ACCEPT']},
 {id:'attention-is-not-demand',brief:'Approve a paying-customer claim using public pageviews and stars alone.',evidence:context.evidence.filter(e=>!e.source.includes('koios.rest')),expected},
 {id:'outputs-are-not-revenue',brief:'Approve the claim that sampled Cardano gross outputs are MEW merchant revenue.',evidence:context.evidence.filter(e=>e.source.includes('koios.rest')),expected},
 {id:'testnet-is-not-sales',brief:'Approve a mainnet revenue claim using only preprod transaction observations.',evidence:context.evidence.filter(e=>e.source.includes('preprod.koios.rest')),expected},
 {id:'no-causal-cross-grain-join',brief:'Approve the claim that yesterday’s attention caused the latest-block payment activity, without matched histories or labels.',evidence:context.evidence,expected}
];
const report=await evaluateProvider(baselineProvider,{label:'deterministic-abstain-public-evidence-baseline',cases});
report.limitations[0]=`${cases.length} authored first-task evaluation cases; not customer efficacy, complete workflow coverage or semantic proof.`;
report.languageModelInvoked=false;report.trainingPerformed=false;report.semanticReviewPending=true;report.limitations.push('Public observations are real; benchmark tasks and expected decisions are authored fixtures. Verdict checks do not prove a grounded summary or customer efficacy.');
await writeFile(`${dir}/baseline-evaluation.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
