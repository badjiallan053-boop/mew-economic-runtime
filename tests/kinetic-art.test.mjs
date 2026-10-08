import test from 'node:test';
import assert from 'node:assert/strict';
import {kineticGeometry,motionAllowed,mountKineticArt} from '../public/kinetic-art.js';

class Target {
  listeners=new Map();
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  fire(type,event={}){for(const fn of [...(this.listeners.get(type)??[])])fn(event);}
}
class Element extends Target {
  constructor(tag){super();this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.classes=new Set();this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v),contains:v=>this.classes.has(v)};}
  set className(v){this.classes=new Set(v.split(' '));}
  setAttribute(k,v){this.attributes[k]=v;}
  querySelector(s){return this.children.find(c=>c.classes.has(s.slice(1)))??null;}
  getBoundingClientRect(){return {width:560,height:470,left:0,top:10,bottom:480};}
  insertBefore(child,before){child.remove();const i=this.children.indexOf(before);if(i<0)throw Error('Missing insertion target');this.children.splice(i,0,child);child.parentNode=this;}
  append(...children){for(const c of children){c.remove();this.children.push(c);c.parentNode=this;}}
  remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}}
}
function environment({noContext=false,failDrawing=false,coarse=false}={}){
  let fills=0,nextFrame=0;
  const frames=new Map(), observers={mutation:[],intersection:[],resize:[]},gradient={addColorStop(){}};
  const ctx=new Proxy({createRadialGradient:()=>gradient,fill:()=>{fills++;},clearRect:()=>{if(failDrawing)throw Error('Canvas failed');}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
  const doc=new Target();doc.hidden=false;doc.createElement=tag=>{const e=new Element(tag);if(tag==='canvas')e.getContext=()=>noContext?null:ctx;return e;};
  const media=new Target();media.matches=false;const pointer=new Target();pointer.matches=coarse;
  const observer=kind=>class {constructor(fn){this.fn=fn;this.disconnected=false;observers[kind].push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.disconnected=true;}};
  const win=new Target();Object.assign(win,{innerHeight:900,devicePixelRatio:4,matchMedia:q=>q.includes('reduced')?media:pointer,MutationObserver:observer('mutation'),IntersectionObserver:observer('intersection'),ResizeObserver:observer('resize'),requestAnimationFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  const figure=new Element('figure'),svg=new Element('svg');svg.className='mandate-sculpture';figure.append(svg);
  return {win,doc,figure,svg,frames,observers,media,pointer,get fills(){return fills;},pump(time){const work=[...frames];frames.clear();for(const [,fn] of work)fn(time);},mutate(){observers.mutation[0].fn([]);}};
}

test('original geometry is deterministic, visibly changes and limits coarse-device mesh without making decisions',()=>{
  const a=kineticGeometry({time:0}),b=kineticGeometry({time:2});assert.equal(a.faces.length,1056);assert.equal(kineticGeometry({coarse:true}).faces.length,448);assert.deepEqual(a,kineticGeometry({time:0}));assert.notDeepEqual(a.faces[0].points,b.faces[0].points);assert.equal(a.paths.length,3);
  for(const f of b.faces)for(const p of f.points)assert.ok([p.x,p.y,p.z].every(Number.isFinite));
  assert.equal(kineticGeometry({decision:'payment-confirmed-by-model'}).state,'READY');assert.throws(()=>kineticGeometry({time:NaN}),/Invalid/);
  assert.equal(motionAllowed({ready:true,paused:false,reduced:false,hidden:false,visible:true,disposed:false}),true);
  assert.equal(motionAllowed({paused:false,reduced:false,hidden:false,visible:true,disposed:false}),false);
});

test('renderer requires working pause readiness and cancels work for pause, reduced motion, hidden and offscreen states',()=>{
  const e=environment(),h=mountKineticArt(e.figure,{window:e.win,document:e.doc});assert.ok(h);assert.equal(e.frames.size,0);assert.ok(e.fills>0);assert.ok(e.svg.parentNode.classList.contains('is-rendered'));
  e.figure.dataset.motionReady='true';e.mutate();assert.equal(e.frames.size,1);const initial=e.fills;e.pump(40);assert.ok(e.fills>initial);assert.equal(e.frames.size,1);
  e.figure.classList.add('is-paused');e.mutate();assert.equal(e.frames.size,0);
  e.figure.classList.remove('is-paused');e.mutate();assert.equal(e.frames.size,1);
  e.doc.hidden=true;e.doc.fire('visibilitychange');assert.equal(e.frames.size,0);
  e.doc.hidden=false;e.doc.fire('visibilitychange');assert.equal(e.frames.size,1);
  e.observers.intersection[0].fn([{isIntersecting:false}]);assert.equal(e.frames.size,0);
  e.observers.intersection[0].fn([{isIntersecting:true}]);assert.equal(e.frames.size,1);
  e.media.matches=true;e.media.fire('change');assert.equal(e.frames.size,0);
  e.media.matches=false;e.media.fire('change');assert.equal(e.frames.size,1);
  e.figure.dataset.motionReady='false';e.mutate();assert.equal(e.frames.size,0);h.dispose();
});

test('pagehide restores the accessible SVG, disconnects observers and prevents duplicate renderers',()=>{
  const e=environment();e.figure.dataset.motionReady='true';const h=mountKineticArt(e.figure,{window:e.win,document:e.doc});assert.equal(mountKineticArt(e.figure,{window:e.win,document:e.doc}),h);assert.equal(e.observers.mutation.length,1);
  const stage=e.svg.parentNode,canvas=stage.children[1];assert.equal(canvas.attributes['aria-hidden'],'true');assert.ok(canvas.width<=1008);
  e.win.fire('pagehide');assert.equal(e.frames.size,0);assert.equal(e.svg.parentNode,e.figure);assert.deepEqual(e.figure.children,[e.svg]);for(const list of Object.values(e.observers))assert.ok(list.every(o=>o.disconnected));
  h.sync();assert.equal(e.frames.size,0);e.observers.mutation[0].fn([]);assert.equal(e.frames.size,0);
  const restored=mountKineticArt(e.figure,{window:e.win,document:e.doc});assert.ok(restored);assert.notEqual(restored,h);restored.dispose();
});

test('unavailable canvas or paint failure never removes the existing SVG fallback',()=>{
  for(const options of [{noContext:true},{failDrawing:true}]){
    const e=environment(options);assert.equal(mountKineticArt(e.figure,{window:e.win,document:e.doc}),null);assert.equal(e.svg.parentNode,e.figure);assert.deepEqual(e.figure.children,[e.svg]);assert.equal(e.frames.size,0);
  }
});
