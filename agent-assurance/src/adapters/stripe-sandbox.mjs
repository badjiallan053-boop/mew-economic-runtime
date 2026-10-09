import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { digest, integer, requestContract } from '../dispatch/contracts.mjs';

// Deliberately test-only. A live integration requires a separate reviewed adapter.
export class StripeSandboxProvider {
  constructor(path, { key, accountId, fetchImpl=globalThis.fetch, clock=()=>Date.now() }={}) {
    if(typeof key!=='string'||! /^(rk|sk)_test_[A-Za-z0-9]+$/.test(key)) throw new Error('Stripe sandbox requires a test-only server key');
    if(typeof accountId!=='string'||! /^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('Expected merchant account is required');
    this.path=path;this.key=key;this.accountId=accountId;this.fetchImpl=fetchImpl;this.clock=clock;
    this.simulated=true;this.supportsIdempotency=false; // No permanent key-only lookup guarantee.
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS stripe_requests (key TEXT PRIMARY KEY, request TEXT NOT NULL,
        digest TEXT NOT NULL, account TEXT NOT NULL, first_attempt INTEGER NOT NULL, intent TEXT);`);
  }
  row(key) { return this.db.prepare('SELECT * FROM stripe_requests WHERE key=?').get(key); }
  async api(path, { body, idempotencyKey }={}) {
    let response;
    try {
      response=await this.fetchImpl('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',
        redirect:'error',signal:AbortSignal.timeout(10000),headers:{
          Authorization:'Basic '+Buffer.from(this.key+':').toString('base64'),
          'Stripe-Version':'2026-09-30.endive',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),
          ...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:body?.toString()});
      if(!response.ok)throw new Error('unavailable');
      const data=await response.json();
      return data;
    } catch { throw new Error('Stripe sandbox outcome unavailable; reconcile original operation'); }
  }
  async checkAccount() {
    const account=await this.api('account');
    if(account.object!=='account'||account.id!==this.accountId)throw new Error('Stripe merchant account mismatch');
  }
  async submit(input, key) {
    const request=requestContract(input);
    if(request.provider!=='stripe-sandbox'||request.recipient!=='stripe:'+this.accountId||request.asset!=='usd-cent')
      throw new Error('Stripe sandbox rail, recipient or asset mismatch');
    integer(request.amount,'amount',50);
    if(request.amount>1000)throw new Error('Sandbox pilot cap is 1000 USD cents');
    if(typeof key!=='string'||key.length>255||!key.length)throw new Error('Bounded operation key required');
    const now=integer(this.clock(),'clock'), requestDigest=digest(request);
    this.db.prepare('INSERT OR IGNORE INTO stripe_requests VALUES (?,?,?,?,?,NULL)')
      .run(key,JSON.stringify(request),requestDigest,this.accountId,now);
    const row=this.row(key);
    if(row.digest!==requestDigest||row.account!==this.accountId)throw new Error('Operation key reused for a different request/account');
    return this.reconcile(row);
  }
  async lookup(key) {
    const row=this.row(key);
    // Local absence is never evidence that Stripe did not accept a payment.
    if(!row)throw Object.assign(new Error('Missing provider journal; operator review required'),{code:'PROVIDER_JOURNAL_MISSING'});
    if(row.account!==this.accountId)throw new Error('Stripe merchant account mismatch');
    return this.reconcile(row);
  }
  async reconcile(row) {
    await this.checkAccount();
    const request=JSON.parse(row.request);
    if(digest(request)!==row.digest)throw new Error('Provider journal request changed');
    let intent;
    if(row.intent) intent=await this.api('payment_intents/'+encodeURIComponent(row.intent));
    else {
      const elapsed=integer(this.clock(),'clock')-row.first_attempt;
      // Stripe may prune keys at 24h. Use a conservative 22h window, never new keys.
      if(elapsed<0||elapsed>=22*60*60*1000)throw Object.assign(new Error('Recovery window expired; operator review required'),{code:'PROVIDER_RECOVERY_EXPIRED'});
      const body=new URLSearchParams({amount:String(request.amount),currency:'usd',confirm:'true',
        payment_method:'pm_card_visa','automatic_payment_methods[enabled]':'true',
        'automatic_payment_methods[allow_redirects]':'never','metadata[mew_request_digest]':row.digest});
      intent=await this.api('payment_intents',{body,idempotencyKey:'mew:'+digest({key:row.key,account:row.account})});
    }
    if(intent.object!=='payment_intent'||!/^pi_[A-Za-z0-9]+$/.test(intent.id)||intent.livemode!==false||
      intent.currency!=='usd'||intent.amount!==request.amount||intent.metadata?.mew_request_digest!==row.digest)
      throw new Error('Stripe sandbox observation does not match reserved request');
    if(row.intent&&row.intent!==intent.id)throw new Error('Stripe payment identity changed');
    this.db.prepare('UPDATE stripe_requests SET intent=? WHERE key=?').run(intent.id,row.key);
    const base={key:row.key,request,requestDigest:row.digest,reference:intent.id,simulated:true,
      verifier:'stripe-api-sandbox',delivered:false};
    if(intent.status==='succeeded'&&intent.amount_received===request.amount)return {...base,status:'accepted'};
    if(intent.status==='canceled'&&intent.amount_received===0)return {...base,status:'failed'};
    return {...base,status:'pending'}; // Authentication/processing/decline is not a safe release.
  }
  close() { this.db.close(); }
}
