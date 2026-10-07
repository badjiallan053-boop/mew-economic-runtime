import {readFileSync} from 'node:fs';
import {inspectMasumiContract} from '../src/adapters/masumi-contract.mjs';
if(process.argv.length!==3)throw new Error('Usage: node scripts/inspect-masumi-contract.mjs /local/path/to/pinned-openapi.json');
console.log(JSON.stringify(inspectMasumiContract(readFileSync(process.argv[2])),null,2));
