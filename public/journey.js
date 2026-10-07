export const storySteps=Object.freeze([
 {id:'understand',label:'Understand',href:'home.html',question:'What goes wrong when a supplier times out?'},
 {id:'try',label:'Try the demo',href:'studio.html#decision-workspace',question:'Why does the second report wait?'},
 {id:'verify',label:'Verify the result',href:'protocol.html#evidence',question:'What does the evidence actually prove?'},
 {id:'plan',label:'Plan a pilot',href:'pilot.html',question:'How would you test your own workflow?'}
]);
export function storyForPath(path){const page=path.split('/').at(-1)||'index.html';const id=['index.html','home.html'].includes(page)?'understand':page==='studio.html'?'try':['protocol.html','research.html'].includes(page)?'verify':page==='pilot.html'?'plan':null;return {id,step:storySteps.find(s=>s.id===id)||null,next:id?storySteps[storySteps.findIndex(s=>s.id===id)+1]||null:storySteps[1]};}
if(typeof document!=='undefined'){
 const main=document.querySelector('main');
 if(main){const story=storyForPath(location.pathname),wrapper=document.createElement('section');wrapper.className='story-journey';wrapper.setAttribute('aria-label','MEW guided story');const nav=document.createElement('nav');nav.setAttribute('aria-label','Understand, try, verify and plan');for(const [i,step]of storySteps.entries()){const a=document.createElement('a'),number=document.createElement('span');a.href=step.href;number.textContent=String(i+1).padStart(2,'0');number.setAttribute('aria-hidden','true');a.append(number,document.createTextNode(step.label));if(step.id===story.id)a.setAttribute('aria-current','step');nav.append(a);}const context=document.createElement('p');context.className='story-context';context.textContent='Main decision example: one report · 3 ADA limit · Alpha 1.50 ADA · Beta 1.40 ADA. All figures are synthetic.';wrapper.append(nav,context);main.prepend(wrapper);
 const footer=document.createElement('section');footer.className='story-next';const title=document.createElement('h2'),description=document.createElement('p'),link=document.createElement('a');
 if(story.next){title.textContent=story.next.question;description.textContent=story.id==='try'?'Inspect why the one-report objective remains occupied even though both prices total less than the budget.':story.id==='verify'?'Turn the lesson into one reviewable pilot brief. Planning does not activate models, book a service or authorize payment.':'Continue with the same report example. The demo uses synthetic supplier and payment evidence.';link.href=story.next.href;link.textContent=story.next.label;}else{title.textContent='Keep the brief reviewable.';description.textContent='Prepare and download the draft above. Agree ownership, rights and budget with your team before arranging any real work.';link.href='studio.html#decision-workspace';link.textContent='Return to the decision example';}
 footer.append(title,description,link);main.append(footer);
 }
}
