import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/motion.js',import.meta.url),'utf8');
function harness(reduced){
 const listeners={},changes=[];let played=0,cancelled=0;
 const preference={matches:reduced,addEventListener:(name,fn)=>changes.push(fn)};
 const element={animate:()=>{played++;return{finished:Promise.resolve(),cancel:()=>cancelled++};}};
 const document={querySelector:()=>element,querySelectorAll:()=>[],getElementById:()=>element,addEventListener:(name,fn)=>listeners[name]=fn};
 runInNewContext(source,{document,window:{addEventListener(){}},matchMedia:()=>preference,Set});
 return{dispatch:kind=>listeners['mew:ui-update']({detail:{kind,id:'panel'}}),reduce:()=>{preference.matches=true;for(const fn of changes)fn();},counts:()=>({played,cancelled})};
}
test('reduced-motion visitor receives immediate state updates without UI animations',()=>{
 const page=harness(true);for(const kind of ['checkpoint','illustration','panel'])page.dispatch(kind);assert.deepEqual(page.counts(),{played:0,cancelled:0});
});
test('changing motion preference cancels active effects and suppresses later effects',()=>{
 const page=harness(false);page.dispatch('checkpoint');assert.equal(page.counts().played,2);page.reduce();assert.equal(page.counts().cancelled,2);page.dispatch('panel');assert.equal(page.counts().played,2);
});
