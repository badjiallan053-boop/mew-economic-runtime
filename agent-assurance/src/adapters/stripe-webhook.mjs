import { createHmac, timingSafeEqual } from 'node:crypto';
import { digest, requestContract } from '../dispatch/contracts.mjs';
import { StripeSandboxProvider } from './stripe-sandbox.mjs';

export const MAX_BODY=256*1024;
const supported=new Set(['payment_intent.succeeded','payment_intent.canceled','payment_intent.payment_failed','payment_intent.processing','payment_intent.requires_action','payment_intent.amount_capturable_updated']);

// Original implementation of Stripe's documented snapshot-event signature format.
export function verifyStripeEvent(raw,header,{secrets,accountId,now=Date.now(),tolerance=300}={}) {
  const fail=()=>{throw new Error('Invalid sandbox webhook');};
  if(!Buffer.isBuffer(raw)||raw.length>MAX_BODY||typeof header!=='string'||header.length>4096||
    !Number.isSafeInteger(now)||!Number.isSafeInteger(tolerance)||tolerance<1||tolerance>300||
    !Array.isArray(secrets)||!secrets.length||secrets.length>2||secrets.some(s=>typeof s!=='string'||!/^whsec_[A-Za-z0-9]{8,}$/.test(s))||
    !/^acct_[A-Za-z0-9]+$/.test(accountId))fail();
  const parts=header.split(',').map(x=>x.trim().split('='));
  const times=parts.filter(x=>x[0]==='t'), signatures=parts.filter(x=>x[0]==='v1'&&x.length===2&&/^[a-fA-F0-9]{64}$/.test(x[1]));
  if(times.length!==1||times[0].length!==2||! /^(0|[1-9][0-9]*)$/.test(times[0][1])||!signatures.length)fail();
  const timestamp=Number(times[0][1]);
  if(!Number.isSafeInteger(timestamp)||Math.abs(Math.floor(now/1000)-timestamp)>tolerance)fail();
  const valid=secrets.some(secret=>{
    const expected=createHmac('sha256',secret).update(times[0][1]+'.').update(raw).digest();
    return signatures.some(s=>timingSafeEqual(expected,Buffer.from(s[1],'hex')));
  });
  if(!valid)fail();
  let event;try{event=JSON.parse(raw.toString('utf8'));}catch{fail();}
  if(event?.object!=='event'||!/^evt_[A-Za-z0-9]+$/.test(event.id)||event.livemode!==false||
    typeof event.type!=='string'||event.type.length>128||event.account&&event.account!==accountId)fail();
  const active=supported.has(event.type), intent=event.data?.object;
  if(active&&(intent?.object!=='payment_intent'||intent.livemode!==false||!/^pi_[A-Za-z0-9]+$/.test(intent.id)||
    !/^[a-f0-9]{64}$/.test(intent.metadata?.mew_request_digest)))fail();
  // No raw payload, customer data, signature or client secret is retained.
  return {id:event.id,type:event.type,account:accountId,intent:active?intent.id:null,
    requestDigest:active?intent.metadata.mew_request_digest:null,active};
}

export class StripeInbox {
  constructor(store,provider,{clock=()=>Date.now()}={}) {
    if(!(provider instanceof StripeSandboxProvider))throw new Error('Sandbox provider required');
    this.store=store;this.provider=provider;this.clock=clock;
    store.db.exec(`CREATE TABLE IF NOT EXISTS stripe_event_inbox (
      id TEXT PRIMARY KEY, descriptor TEXT NOT NULL, digest TEXT NOT NULL, state TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, token INTEGER NOT NULL DEFAULT 0,
      lease_until INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0);`);
  }
  accept(raw,header,secrets) {
    const event=verifyStripeEvent(raw,header,{secrets,accountId:this.provider.accountId,now:this.clock()});
    return this.store.transact(()=>{
      const old=this.store.db.prepare('SELECT * FROM stripe_event_inbox WHERE id=?').get(event.id);
      if(old&&old.digest!==digest(event))throw new Error('Conflicting sandbox event');
      if(!old)this.store.db.prepare('INSERT INTO stripe_event_inbox (id,descriptor,digest,state) VALUES (?,?,?,?)')
        .run(event.id,JSON.stringify(event),digest(event),event.active?'PENDING':'IGNORED');
      return {id:event.id,duplicate:!!old};
    });
  }
  async tick() {
    const now=this.clock(), db=this.store.db;
    const row=this.store.transact(()=>{
      const candidate=db.prepare("SELECT * FROM stripe_event_inbox WHERE state IN ('PENDING','RETRY','PROCESSING') AND next_at<=? AND lease_until<=? ORDER BY id LIMIT 1").get(now,now);
      if(!candidate)return null;
      if(candidate.attempts>=8){db.prepare("UPDATE stripe_event_inbox SET state='REVIEW' WHERE id=?").run(candidate.id);return null;}
      db.prepare("UPDATE stripe_event_inbox SET state='PROCESSING',attempts=attempts+1,token=token+1,lease_until=? WHERE id=?").run(now+30000,candidate.id);
      return {...candidate,token:candidate.token+1};
    });
    if(!row)return false;
    const event=JSON.parse(row.descriptor);
    let observation,operation;
    try {
      const matches=this.store.operations().filter(op=>op.requestDigest===event.requestDigest&&op.request.provider==='stripe-sandbox');
      if(matches.length!==1||matches[0].attempts<1)throw new Error('Unmapped event');
      operation=matches[0];
      observation=await this.provider.readObservation(operation.key,event.intent);
    } catch { observation=null; }
    this.store.transact(k=>{
      const current=db.prepare('SELECT * FROM stripe_event_inbox WHERE id=?').get(row.id);
      if(current.token!==row.token||current.state!=='PROCESSING'||current.lease_until<=this.clock())return;
      if(!observation||observation.status==='pending') {
        db.prepare("UPDATE stripe_event_inbox SET state='RETRY',lease_until=0,next_at=? WHERE id=?").run(this.clock()+30000,row.id);
        return;
      }
      const op=this.store.operation(operation.id), e=k.snapshot().effects.find(x=>x.id===op.id);
      const expected=e&&requestContract({effectId:e.id,objectiveId:e.objectiveId,principal:k.objective(e.objectiveId).principal,
        semanticKey:e.semanticKey,provider:e.provider,recipient:e.recipientAddress,asset:e.asset,amount:e.amount});
      if(!expected||digest(expected)!==op.requestDigest||op.attempts<1||['BLOCKED','CANCELLED'].includes(op.state))throw new Error('Persisted authority changed');
      op.token++;op.history.push({token:op.token,kind:'webhook-reconcile',at:this.clock()});
      this.store.applyObservation(k,op,observation);
      db.prepare("UPDATE stripe_event_inbox SET state='APPLIED',lease_until=0 WHERE id=?").run(row.id);
    });
    return true;
  }
}
