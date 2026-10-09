import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script=fileURLToPath(new URL('./child.mjs',import.meta.url));
function message(child,stage) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();child.kill('SIGKILL');reject(new Error('Fixture child timed out at '+stage));},5000);
    const onMessage=m=>{if(m.stage==='error'){cleanup();reject(new Error(m.error));}else if(m.stage===stage){cleanup();resolve(m);}};
    const onExit=()=>{cleanup();reject(new Error('Fixture child exited before '+stage));};
    const cleanup=()=>{clearTimeout(timer);child.off('message',onMessage);child.off('exit',onExit);};
    child.on('message',onMessage);child.once('exit',onExit);
  });
}
function exit(child) {
  return new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
}
export async function killDispatch(storePath,providerPath,id,stage) {
  if(!['crash-before-send','crash-after-accept'].includes(stage)) throw new Error('Unknown crash fixture');
  const child=fork(script,[storePath,stage,providerPath],{execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
  try{
    await message(child,'ready');
    const point=message(child,'kill-point');
    child.send({id});
    await point;
    const stopped=exit(child);
    child.kill('SIGKILL');
    const result=await stopped;
    if(result.signal!=='SIGKILL') throw new Error('Crash fixture did not kill the process');
    return result;
  } finally {if(child.exitCode===null && child.signalCode===null) child.kill('SIGKILL');}
}
export async function competingReservations(storePath,proposals) {
  const children=proposals.map(()=>fork(script,[storePath,'reserve'],{execArgv:[],stdio:['ignore','ignore','ignore','ipc']}));
  try{
    await Promise.all(children.map(c=>message(c,'ready')));
    // Barrier: both processes have opened the same SQLite store before either proposes.
    const stopped=children.map(c=>exit(c));
    const results=children.map(c=>message(c,'result'));
    children.forEach((c,i)=>c.send({proposal:proposals[i]}));
    const out=await Promise.all(results);
    const ends=await Promise.all(stopped);
    if(ends.some(e=>e.code!==0)) throw new Error('Reservation fixture failed');
    return out.map(x=>x.decision);
  } finally {children.forEach(c=>{if(c.exitCode===null && c.signalCode===null)c.kill('SIGKILL');});}
}
