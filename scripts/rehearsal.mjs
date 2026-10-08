import { mkdirSync, writeFileSync } from 'node:fs';
import { createRehearsal, advanceRehearsal } from '../src/demo/rehearsal.mjs';
let state=createRehearsal(process.argv[2] || 'timeout');
while(state.stage<7&&!state.blocked)state=advanceRehearsal(state,{expectedStage:state.stage});
mkdirSync('.local/evidence',{recursive:true});
writeFileSync('.local/evidence/rehearsal.json',JSON.stringify(state,null,2));
console.log(`Local simulation: ${state.blocked?'safely stopped':'complete'}; ${state.kernel.effects.length} reserved purchase(s). Evidence: .local/evidence/rehearsal.json. Live proof pending.`);
