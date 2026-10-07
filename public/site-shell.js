const primary=[['home.html','Understand'],['studio.html','Try'],['protocol.html#evidence','Verify'],['pilot.html','Plan']];
const supporting=[['company.html','Agent workflows'],['design-studio.html','Design tools'],['research.html','Source library'],['knowledge.html','Engineering knowledge'],['campaign.html','Clip rehearsal']];
const nav=document.createElement('nav');nav.className='site-nav';nav.setAttribute('aria-label','MEW website');const brand=document.createElement('a');brand.className='site-brand';brand.href='home.html';brand.textContent='mew';const mark=document.createElement('span');mark.textContent='✳';mark.setAttribute('aria-hidden','true');brand.append(mark);nav.append(brand);
function addLink(parent,path,label){const a=document.createElement('a');a.href=path;a.textContent=label;const page=path.split('#')[0];if(location.pathname.endsWith('/'+page)||(page==='home.html'&&(location.pathname==='/'||location.pathname.endsWith('/index.html'))))a.setAttribute('aria-current','page');parent.append(a);}
for(const [path,label]of primary)addLink(nav,path,label);
const details=document.createElement('details');details.className='support-nav';const summary=document.createElement('summary');summary.textContent='More workspaces';const menu=document.createElement('div');for(const [path,label]of supporting)addLink(menu,path,label);details.append(summary,menu);nav.append(details);document.body.prepend(nav);

// Native disclosure: Escape restores focus; outside pointer closes without trapping it.
details.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;summary.focus();event.preventDefault();}});
document.addEventListener('pointerdown',event=>{if(details.open&&!details.contains(event.target))details.open=false;});
