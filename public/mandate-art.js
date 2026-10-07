/**
 * Retained Field — original explanatory generative artwork.
 * A shared boundary stays intact as supplier paths arrive. A held path persists
 * when its result is unknown; a second equivalent path stops outside the field.
 * Seeded variation changes only the surrounding field, never the state meaning.
 * This module performs no requests, accounting, inference or payment operations.
 */
const NS='http://www.w3.org/2000/svg';
const phases=new Set(['scope','reserved','unknown','defer']);
function randomSequence(seed){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function seedValue(value){let seed=2166136261;for(const character of String(value)){seed=Math.imul(seed^character.charCodeAt(0),16777619);}return seed>>>0;}
function element(name,attributes={},children=[]){const node=document.createElementNS(NS,name);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));for(const child of children)node.append(child);return node;}
function point(angle,radius){return[300+Math.cos(angle)*radius,210+Math.sin(angle)*radius*.84];}
function coordinate(pair){return pair.map(value=>value.toFixed(2)).join(' ');}
export function createMandateArt(seed='mew-report-mandate'){
 const random=randomSequence(seedValue(seed));
 const svg=element('svg',{viewBox:'0 0 600 420','aria-hidden':'true',focusable:'false',class:'mandate-field'});
 const field=element('g',{class:'mandate-field-texture'});
 // Bounded, reproducible contour paths; fixed maximum 26 × 65 vertices.
 for(let ring=0;ring<26;ring++){
  const radius=55+ring*5.9;const phase=random()*Math.PI*2;let path='';
  for(let step=0;step<=64;step++){
   const angle=step/64*Math.PI*2;
   const offset=Math.sin(angle*3+phase)*5+Math.sin(angle*5-phase)*2;
   const location=point(angle,radius+offset);
   path+=(step===0?'M':'L')+coordinate(location)+' ';
  }
  field.append(element('path',{d:path+'Z',opacity:(.11+ring/26*.19).toFixed(3)}));
 }
 svg.append(field);
 svg.append(element('ellipse',{cx:300,cy:210,rx:142,ry:119.28,class:'mandate-boundary'}));
 svg.append(element('ellipse',{cx:300,cy:210,rx:132,ry:110.88,class:'mandate-boundary-inner'}));
 const trajectories=element('g',{class:'mandate-trajectories'});
 trajectories.append(element('path',{d:'M 42 91 C 111 91 91 170 181 188 C 217 195 251 202 278 210',class:'mandate-path mandate-path-admitted'}));
 trajectories.append(element('path',{d:'M 549 329 C 469 331 497 273 451 253',class:'mandate-path mandate-path-equivalent'}));
 trajectories.append(element('path',{d:'M 548 90 C 450 90 499 163 433 177',class:'mandate-path mandate-path-neutral'}));
 svg.append(trajectories);
 svg.append(element('circle',{cx:42,cy:91,r:7,class:'mandate-supplier mandate-supplier-a'}));
 svg.append(element('circle',{cx:549,cy:329,r:7,class:'mandate-supplier mandate-supplier-b'}));
 svg.append(element('circle',{cx:548,cy:90,r:5,class:'mandate-supplier mandate-supplier-neutral'}));
 svg.append(element('circle',{cx:300,cy:210,r:30,class:'mandate-shared-core'}));
 svg.append(element('path',{d:'M 286 210 H 314 M 300 196 V 224 M 290 200 L 310 220 M 290 220 L 310 200',class:'mandate-core-mark'}));
 svg.append(element('circle',{cx:278,cy:210,r:7,class:'mandate-held-marker'}));
 svg.append(element('circle',{cx:278,cy:210,r:17,class:'mandate-unknown-ring'}));
 svg.append(element('path',{d:'M 451 240 V 266',class:'mandate-defer-stop'}));
 return svg;
}
export function renderMandateArt(container,phase=container?.dataset.artPhase||'scope'){
 if(!container||!phases.has(phase))return false;
 if(!container.querySelector(':scope > svg.mandate-field'))container.append(createMandateArt(container.dataset.artSeed||'mew-report-mandate'));
 container.dataset.artPhase=phase;
 return true;
}
export function setMandateArtPhase(phase,root=document){
 if(!phases.has(phase))return false;
 for(const container of root.querySelectorAll('[data-mandate-art]'))renderMandateArt(container,phase);
 return true;
}
function initialize(){for(const container of document.querySelectorAll('[data-mandate-art]'))renderMandateArt(container);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
document.addEventListener('mew:art-phase',event=>{setMandateArtPhase(event.detail?.phase);});
