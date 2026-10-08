import {readFile} from 'node:fs/promises';
import {revalidateCardanoObservation} from '../src/adapters/cardano-observation.mjs';
try {
 if(process.argv.length!==3)throw Error('Expected one persisted observation JSON path');
 const raw=await readFile(process.argv[2]);
 if(raw.length>4096)throw Error('Observation exceeds size limit');
 const result=await revalidateCardanoObservation({observation:JSON.parse(raw)});
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='STILL_OBSERVED')process.exitCode=1;
} catch {console.error('Observation rejected. Supply an immutable preprod transaction/block binding. No capacity was released.');process.exitCode=1;}
