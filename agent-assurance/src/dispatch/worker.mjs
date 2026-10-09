import { resolve } from 'node:path';
import { statSync } from 'node:fs';
import { SandboxProvider } from '../adapters/sandbox-provider.mjs';
import { integer, text } from './contracts.mjs';

export class DispatchWorker {
  constructor({store,provider,clock=()=>Date.now(),owner='sandbox-worker',leaseMs=1000,maxAttempts=2,maxCycles=4,hooks={}}) {
    if(!(provider instanceof SandboxProvider)) throw new Error('Dispatch is restricted to the local simulator');
    if(store.path!==':memory:' && provider.path!==':memory:' && resolve(store.path)===resolve(provider.path)) throw new Error('Provider ledger must be independent');
    if(store.path!==':memory:' && provider.path!==':memory:'){
      const a=statSync(store.path),b=statSync(provider.path);
      if(a.dev===b.dev&&a.ino===b.ino)throw new Error('Provider ledger must be independent');
    }
    integer(leaseMs,'lease',1);integer(maxAttempts,'max attempts',1);integer(maxCycles,'max cycles',1);text(owner,'owner');
    Object.assign(this,{store,provider,clock,owner,leaseMs,maxAttempts,maxCycles,hooks});
  }
  async tick(id,{fault}={}) {
    const op=this.store.claim(id,this.owner,this.clock(),this.leaseMs,this);
    if(!op) return null;
    if(op.kind==='submit') await this.hooks.beforeSend?.(op);
    let observation;
    try {
      observation=op.kind==='submit'?this.provider.submit(op.request,op.key,{fault}):this.provider.lookup(op.key,{fault});
    } catch {
      return this.store.recordUnknown(id,op.token,this.owner,this.clock(),'Provider outcome unknown; reconcile original key');
    }
    await this.hooks.afterObservation?.(op,observation);
    if(observation.status==='not-found') return this.store.recordNotFound(id,op.token,this.owner,this.clock(),
      {safeToRetry:this.provider.supportsIdempotency===true,maxAttempts:this.maxAttempts});
    if(observation.status==='pending') return this.store.recordUnknown(id,op.token,this.owner,this.clock(),'Provider pending; reconcile original key');
    return this.store.recordObservation(id,op.token,this.owner,this.clock(),observation);
  }
  refresh(id) {
    const op=this.store.operation(id);
    if(!op) throw new Error('Unknown operation');
    const observation=this.provider.lookup(op.key);
    return this.store.refreshObservation(id,observation,this.clock());
  }
}
