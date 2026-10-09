import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MEW } from '../core/mew.mjs';
import { digest, integer, requestContract, text } from '../dispatch/contracts.mjs';

export class Store {
  constructor(path) {
    this.path = path;
    if(path !== ':memory:') mkdirSync(dirname(path), { recursive:true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.prepare('INSERT OR IGNORE INTO runtime VALUES (1, ?)').run(JSON.stringify(new MEW().snapshot()));
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (version > 1) throw new Error('Unsupported future database version');
      this.db.exec(`CREATE TABLE IF NOT EXISTS dispatch_outbox (
        id TEXT PRIMARY KEY, request TEXT NOT NULL, request_digest TEXT NOT NULL, submission_key TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL CHECK(state IN ('READY','DISPATCHING','UNKNOWN','OBSERVED','BLOCKED','CANCELLED')),
        attempts INTEGER NOT NULL DEFAULT 0, cycles INTEGER NOT NULL DEFAULT 0,
        token INTEGER NOT NULL DEFAULT 0, owner TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL DEFAULT '', reference TEXT, history TEXT NOT NULL DEFAULT '[]'
      ); PRAGMA user_version=1;`);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); this.db.close(); throw error; }
  }
  read() { return new MEW(JSON.parse(this.db.prepare('SELECT snapshot FROM runtime WHERE id=1').get().snapshot)); }
  transact(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const kernel=this.read();
      const result=fn(kernel, this.db);
      if(result?.then) throw new Error('Transactions must be synchronous');
      this.db.prepare('UPDATE runtime SET snapshot=? WHERE id=1').run(JSON.stringify(kernel.snapshot()));
      this.db.exec('COMMIT'); return result;
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  reset(objective) {
    return this.transact(k=>{if(this.operations().length) throw new Error('Cannot reset a dispatch ledger');k.state=new MEW().snapshot();k.createObjective(objective);return k.snapshot();});
  }
  operation(id) {
    const row = this.db.prepare('SELECT * FROM dispatch_outbox WHERE id=?').get(id);
    if (!row) return null;
    return { id:row.id, request:JSON.parse(row.request), requestDigest:row.request_digest, key:row.submission_key,
      state:row.state, attempts:row.attempts, cycles:row.cycles, token:row.token, owner:row.owner,
      leaseUntil:row.lease_until, reason:row.reason, reference:row.reference, history:JSON.parse(row.history) };
  }
  operations() {
    return this.db.prepare('SELECT id FROM dispatch_outbox ORDER BY id').all().map(row=>this.operation(row.id));
  }
  enqueue(input, { beforeCommit } = {}) {
    return this.transact(k=>{
      const result=k.evaluate(input);
      let operation=this.operation(result.effect.id);
      if (result.decision === 'ALLOW') {
        const e=result.effect;
        const request=requestContract({effectId:e.id,objectiveId:e.objectiveId,principal:k.objective(e.objectiveId).principal,
          semanticKey:e.semanticKey,provider:e.provider,recipient:e.recipientAddress,asset:e.asset,amount:e.amount});
        const requestDigest=digest(request);
        const key='sandbox:'+digest({principal:request.principal,objectiveId:request.objectiveId,effectId:request.effectId});
        this.db.prepare('INSERT INTO dispatch_outbox (id,request,request_digest,submission_key,state) VALUES (?,?,?,?,?)')
          .run(e.id,JSON.stringify(request),requestDigest,key,'READY');
        operation=this.operation(e.id);
      }
      if(beforeCommit) beforeCommit();
      return {...result,operation:result.decision==='DENY'?null:operation};
    });
  }
  writeOperation(op) {
    this.db.prepare('UPDATE dispatch_outbox SET state=?,attempts=?,cycles=?,token=?,owner=?,lease_until=?,reason=?,reference=?,history=? WHERE id=?')
      .run(op.state,op.attempts,op.cycles,op.token,op.owner,op.leaseUntil,op.reason,op.reference,JSON.stringify(op.history),op.id);
  }
  claim(id, owner, now, leaseMs, { maxAttempts=2, maxCycles=4 }={}) {
    text(owner,'worker');integer(now,'clock');integer(leaseMs,'lease',1);
    integer(now+leaseMs,'lease deadline');integer(maxAttempts,'max attempts',1);integer(maxCycles,'max cycles',1);
    return this.transact(k=>{
      const op=this.operation(id);
      if(!op || ['OBSERVED','BLOCKED','CANCELLED'].includes(op.state)) return null;
      if(op.owner && op.leaseUntil>now) return null;
      const effect=k.snapshot().effects.find(e=>e.id===id);
      const expected=effect && requestContract({effectId:effect.id,objectiveId:effect.objectiveId,principal:k.objective(effect.objectiveId).principal,
        semanticKey:effect.semanticKey,provider:effect.provider,recipient:effect.recipientAddress,asset:effect.asset,amount:effect.amount});
      if(!expected || digest(expected)!==op.requestDigest || digest(op.request)!==op.requestDigest ||
        ['failed','released','refunded'].includes(effect.status) || (op.state==='READY' && (effect.status!=='reserved'||effect.unknown))) {
        op.state='BLOCKED';op.owner=null;op.leaseUntil=0;op.reason='Persisted authority/request changed; operator review required';
        this.writeOperation(op);return null;
      }
      if(op.state==='DISPATCHING') {
        op.state='UNKNOWN';
        k.observe({claimId:'sandbox:expired:'+id+':'+op.token,effectId:id,source:'sandbox',type:'unknown',
          evidence:{simulated:true,verifier:'sandbox',verified:false}});
      }
      const kind=op.state==='READY'?'submit':'lookup';
      if((kind==='submit' && op.attempts>=maxAttempts) || (kind==='lookup' && op.cycles>=maxCycles)) {
        op.state='UNKNOWN';op.owner=null;op.leaseUntil=0;op.reason='Bound reached; operator review required';
        this.writeOperation(op);return null;
      }
      op.token++;op.owner=owner;op.leaseUntil=now+leaseMs;
      if(kind==='submit'){op.state='DISPATCHING';op.attempts++;}
      else op.cycles++;
      op.history.push({token:op.token,kind,at:now});
      this.writeOperation(op);
      return {...op,kind};
    });
  }
  assertLease(id, token, owner, now) {
    const op=this.operation(id);
    if(!op || op.token!==token || op.owner!==owner || now>=op.leaseUntil) throw new Error('Stale worker lease');
    return op;
  }
  recordUnknown(id,token,owner,now,reason='Provider outcome unknown') {
    return this.transact(k=>{
      const op=this.assertLease(id,token,owner,now);
      op.state='UNKNOWN';op.owner=null;op.leaseUntil=0;op.reason=reason;
      k.observe({claimId:'sandbox:unknown:'+id+':'+token,effectId:id,source:'sandbox',type:'unknown',
        evidence:{simulated:true,verifier:'sandbox',verified:false}});
      this.writeOperation(op);return op;
    });
  }
  recordNotFound(id,token,owner,now,{safeToRetry=false,maxAttempts=2}={}) {
    integer(maxAttempts,'max attempts',1);
    return this.transact(k=>{
      const op=this.assertLease(id,token,owner,now);
      op.state=safeToRetry && op.attempts<maxAttempts?'READY':'UNKNOWN';
      op.owner=null;op.leaseUntil=0;
      op.reason=op.state==='READY'?'Authoritative simulator lookup returned not-found; stable key retry eligible':'No safe retry; operator review required';
      if(op.state==='READY')k.state.effects.find(e=>e.id===id).unknown=false;
      this.writeOperation(op);return op;
    });
  }
  recordObservation(id,token,owner,now,observation) {
    return this.transact(k=>{
      const op=this.assertLease(id,token,owner,now);
      return this.applyObservation(k,op,observation);
    });
  }
  applyObservation(k,op,observation) {
      const id=op.id;
      if(!observation || observation.simulated!==true || observation.key!==op.key ||
        digest(observation.request)!==op.requestDigest || observation.requestDigest!==op.requestDigest)
        throw new Error('Provider observation does not match reserved request');
      const {status,reference}=observation;
      if(!['accepted','failed','refunded'].includes(status)) throw new Error('Unsupported provider observation');
      text(reference,'provider reference');
      const financial=status==='accepted'?'settled':status;
      const verifier=observation.verifier==='stripe-api-sandbox'?'stripe-api-sandbox':'local-simulator';
      const evidence={verified:true,simulated:true,verifier,providerReference:reference};
      k.observe({claimId:'sandbox:'+reference+':'+financial,effectId:id,source:'web2',type:'payment.'+financial,
        amount:op.request.amount,evidence});
      if(observation.delivered && status==='accepted') k.observe({claimId:'sandbox:'+reference+':delivery',effectId:id,
        source:'merchant',type:'delivery',evidence});
      op.state='OBSERVED';op.owner=null;op.leaseUntil=0;op.reference=reference;op.reason='Synthetic provider observation recorded';
      this.writeOperation(op);return op;
  }
  refreshObservation(id,observation,now=0) {
    // Simulator-only refresh of an already observed operation (late delivery/full refund).
    integer(now,'clock');
    return this.transact(k=>{
      const op=this.operation(id);
      if(!op || op.state!=='OBSERVED') throw new Error('Operation is not observed');
      op.token++;op.history.push({token:op.token,kind:'refresh',at:now});
      return this.applyObservation(k,op,observation);
    });
  }
  close() { this.db.close(); }
}

