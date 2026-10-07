import {readFile} from 'node:fs/promises';
import {planApprovalEscrow} from '../src/adapters/approval-escrow-plan.mjs';
try {
 if(process.argv.length!==3)throw Error('Expected one local intent JSON path');
 const raw=await readFile(process.argv[2]);
 if(raw.length>16384)throw Error('Intent exceeds size limit');
 console.log(JSON.stringify(planApprovalEscrow(JSON.parse(raw)),null,2));
} catch {console.error('Escrow plan rejected. Check the documented fields, network, addresses and exposure cap. No transaction was built or signed.');process.exitCode=1;}
