import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runSuite } from '../src/eval/runner.mjs';
import { buildReport, verifyReport, assertExpectedSuite, renderHTML } from '../src/eval/report.mjs';

try{
  const args=process.argv.slice(2);
  if(args[0]==='--verify'){
    if(args.length!==2)throw new Error('Use --verify REPORT.json');
    const path=resolve(args[1]);
    const raw=readFileSync(path,'utf8');if(Buffer.byteLength(raw)>1048576)throw new Error('Report exceeds 1 MiB');
    const report=JSON.parse(raw);verifyReport(report);assertExpectedSuite(report);
    console.log('Verified 45 simulated results, expected negative controls and report digest.');
  }else{
    if(args.length!==2||args[0]!=='--out')throw new Error('Use --out DIRECTORY');
    // A checkout HEAD would mislabel uncommitted source. CI supplies its checked-out revision.
    const codeRevision=process.env.GITHUB_SHA||'unversioned';
    const report=buildReport(await runSuite(),{codeRevision});assertExpectedSuite(report);
    const out=resolve(args[1]);mkdirSync(out,{recursive:true});
    writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    writeFileSync(join(out,'report.html'),renderHTML(report));
    console.log('45 simulated runs: 14/15 guarded pass; bypass intentionally fails coverage. JSON and HTML written.');
  }
}catch(error){console.error('Assurance failed: '+error.message);process.exitCode=1;}
