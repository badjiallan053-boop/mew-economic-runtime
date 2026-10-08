// Presentation context only. This catalog never authorizes work or carries ledger state.
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
export const workflowCatalog=freeze({
 report:{id:'report',name:'Research report',goal:'one report',limit:3000000,first:{name:'Alpha',amount:1500000},second:{name:'Beta',amount:1400000},example:'One report · 3 ADA limit · Alpha 1.50 ADA · Beta 1.40 ADA.',
  routes:{understand:'home.html',try:'studio.html#decision-workspace',verify:'protocol.html#evidence',plan:'pilot.html'},
  questions:{understand:'What happens when a supplier goes quiet?',try:'Why does the second report wait?',verify:'What does the evidence prove?',plan:'How would you test one report with your team?'}},
 clips:{id:'clips',name:'Marketing & clipping',goal:'one five-outline bundle',limit:10000000,first:{name:'Editor A',amount:8000000},second:{name:'Editor B',amount:6000000},example:'One five-outline bundle · 10 ADA limit · Editor A 8 ADA · Editor B 6 ADA.',
  routes:{understand:'marketing.html#workflow',try:'campaign.html',verify:'protocol.html#evidence',plan:'pilot.html'},
  questions:{understand:'How does one recording become a campaign?',try:'What if a second editor offers the same job?',verify:'What does the outline demo actually prove?',plan:'How would you test five outlines with your team?'}}
});
const pageOf=path=>path.split('/').at(-1)||'index.html';
export function workflowForLocation(path,search=''){
 const page=pageOf(path);
 // Fixed demos always describe their own fixture, even with a conflicting query.
 if(['marketing.html','campaign.html'].includes(page))return workflowCatalog.clips;
 if(['index.html','home.html','studio.html','ledger.html','rehearsal.html'].includes(page))return workflowCatalog.report;
 const query=new URLSearchParams(search).get('workflow');
 return workflowCatalog[Object.hasOwn(workflowCatalog,query)?query:'report'];
}
export function contextHref(href,workflow){
 if(!Object.hasOwn(workflowCatalog,workflow))throw new Error('Unknown presentation workflow');
 const url=new URL(href,'https://mew.invalid/');
 if(url.origin!=='https://mew.invalid'||!url.pathname.endsWith('.html'))return href;
 // Forward only the public enum. Never copy customer input, access tokens or other queries.
 url.search='';url.searchParams.set('workflow',workflow);
 return `${url.pathname.slice(1)}${url.search}${url.hash}`;
}
export function stepsForWorkflow(workflow){
 const profile=Object.hasOwn(workflowCatalog,workflow)?workflowCatalog[workflow]:null;if(!profile)throw new Error('Unknown presentation workflow');
 return ['understand','try','verify','plan'].map((id,index)=>({id,label:['Understand','Try the demo','Verify the result','Plan a pilot'][index],href:contextHref(profile.routes[id],workflow),question:profile.questions[id]}));
}
export function presentationMode(path){
 const page=pageOf(path);
 if(['index.html','home.html'].includes(page))return 'Private to this tab · no shared reservation';
 if(['campaign.html','studio.html','design-studio.html','rehearsal.html','ledger.html'].includes(page))return 'Shared demo · coordinate changes with other presenters';
 if(page==='pilot.html')return 'Local draft · nothing submitted';
 if(page==='company.html')return 'Configured responsibilities · no model execution';
 return 'Explanation and evidence · no work dispatched';
}

// Contextual destinations for existing explanatory links. Explicit workflow links
// are choices and are left intact; external links and local anchors are untouched.
export function workflowLink(href,workflow){
 if(href.startsWith('#'))return href;
 const url=new URL(href,'https://mew.invalid/');
 if(url.origin!=='https://mew.invalid')return href;
 if(url.searchParams.has('workflow')){const selected=url.searchParams.get('workflow');return contextHref(href,Object.hasOwn(workflowCatalog,selected)?selected:workflow);}
 const page=pageOf(url.pathname),profile=workflowCatalog[workflow];
 if(!Object.hasOwn(workflowCatalog,workflow))throw new Error('Unknown presentation workflow');
 if(['home.html','studio.html'].includes(page)){
  const stage=page==='home.html'?'understand':'try';
  if(workflow==='clips')return contextHref(profile.routes[stage],workflow);
 }
 if(['marketing.html','campaign.html'].includes(page))return contextHref(href,'clips');
 if(['home.html','studio.html','protocol.html','research.html','pilot.html','company.html','knowledge.html','design-studio.html'].includes(page))return contextHref(href,workflow);
 return href;
}
export function syncWorkflowLinks(root,workflow){
 for(const link of root.querySelectorAll('a[href]')){
  // Retain the authored route for a later explicit example change.
  const original=link.dataset.workflowHref??link.getAttribute('href');
  link.dataset.workflowHref=original;link.setAttribute('href',workflowLink(original,workflow));
 }
}

export function formatExampleAda(lovelace){
 if(!Number.isSafeInteger(lovelace)||lovelace<0)throw new Error('Invalid example amount');
 return (lovelace/1000000).toFixed(2).replace(/\.00$/,'')+' ADA';
}
