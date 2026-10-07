import {createHash} from 'node:crypto';
export const studioTeam=[{id:'product',task:'Define audience, outcome and scope',boundary:'No consent inferred'},{id:'experience',task:'Review journey and recovery',boundary:'No user testing claimed'},{id:'visual',task:'Apply shared tokens and readable hierarchy',boundary:'Artwork is not operational evidence'},{id:'engineering',task:'Preserve schemas and authority',boundary:'No signing or dispatch'},{id:'evidence',task:'Challenge unsupported claims',boundary:'Rule checks do not verify truth'}];
export function emptyDesignStudio(){return {version:1,revision:0,mode:'deterministic-demo',brief:null,critique:[],status:'NO_BRIEF',team:studioTeam};}
export function reviseDesignStudio(previous,input){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).sort().join(',')!=='audience,claims,evidenceClass,expectedRevision,goal,title')throw Error('Invalid studio brief');
 const current=previous||emptyDesignStudio();if(input.expectedRevision!==current.revision)throw Error('Stale brief revision: reload before saving');
 if(!['investor','partner','customer'].includes(input.audience)||!['synthetic','tested-local','proposed'].includes(input.evidenceClass))throw Error('Invalid studio scope');
 for(const [key,max] of [['title',120],['goal',400],['claims',1200]])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)throw Error('Invalid bounded brief');
 const {expectedRevision,...brief}=input;
 const critique=studioTeam.map(role=>({reviewer:role.id,rule:role.id==='evidence'?'CLAIM_LANGUAGE':'HUMAN_REVIEW',result:role.id==='evidence'&&/\b(live|guarantee\w*|revenue|paid|customer\w*|production.ready)\b/i.test(brief.claims)?'FLAGGED':'REVIEW_REQUIRED',detail:role.task+'. '+role.boundary+'. Human review remains required.'}));
 return {version:1,revision:current.revision+1,mode:'deterministic-demo',brief,briefSha256:createHash('sha256').update(JSON.stringify(brief)).digest('hex'),critique,status:'NEEDS_HUMAN_REVIEW',team:studioTeam};
}
