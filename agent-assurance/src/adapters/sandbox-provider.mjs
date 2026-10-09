import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { digest, requestContract, text } from '../dispatch/contracts.mjs';

// Local fixture receiver. No HTTP, keys, wallets or real payment capability.
export class SandboxProvider {
  constructor(path) {
    this.path=path;
    this.simulated=true;
    this.supportsIdempotency=true;
    if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS purchases (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, request TEXT NOT NULL,
        digest TEXT NOT NULL, status TEXT NOT NULL, delivered INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS provider_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, kind TEXT NOT NULL);`);
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try{const result=fn();this.db.exec('COMMIT');return result;}
    catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  observation(row) {
    return row?{key:row.key,request:JSON.parse(row.request),requestDigest:row.digest,status:row.status,
      delivered:row.delivered===1,reference:'synthetic-'+row.seq,simulated:true}:{status:'not-found',simulated:true};
  }
  submit(input,key,{fault}={}) {
    const request=requestContract(input);text(key,'idempotency key');
    if(fault==='outage') throw new Error('Synthetic provider unavailable');
    const result=this.transaction(()=>{
      const old=this.db.prepare('SELECT * FROM purchases WHERE key=?').get(key);
      if(old){if(old.digest!==digest(request)) throw new Error('Idempotency key has a different request');return this.observation(old);}
      this.db.prepare('INSERT INTO purchases (key,request,digest,status) VALUES (?,?,?,?)')
        .run(key,JSON.stringify(request),digest(request),'accepted');
      this.db.prepare('INSERT INTO provider_events (key,kind) VALUES (?,?)').run(key,'accepted');
      return this.lookup(key);
    });
    if(fault==='lost-response') throw new Error('Synthetic response lost after acceptance');
    return result;
  }
  lookup(key,{fault}={}) {
    text(key,'idempotency key');
    if(fault==='outage') throw new Error('Synthetic lookup unavailable');
    if(fault==='pending') return {status:'pending',simulated:true};
    return this.observation(this.db.prepare('SELECT * FROM purchases WHERE key=?').get(key));
  }
  deliver(key) {
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT * FROM purchases WHERE key=?').get(key);
      if(!row || row.status!=='accepted') throw new Error('No accepted purchase for delivery');
      if(!row.delivered){this.db.prepare('UPDATE purchases SET delivered=1 WHERE key=?').run(key);this.db.prepare('INSERT INTO provider_events (key,kind) VALUES (?,?)').run(key,'delivery');}
      return this.lookup(key);
    });
  }
  refund(key) {
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT * FROM purchases WHERE key=?').get(key);
      if(!row || row.status!=='accepted' || row.delivered) throw new Error('Refund fixture requires an undelivered accepted purchase');
      this.db.prepare('UPDATE purchases SET status=? WHERE key=?').run('refunded',key);
      this.db.prepare('INSERT INTO provider_events (key,kind) VALUES (?,?)').run(key,'refund');
      return this.lookup(key);
    });
  }
  records(){return this.db.prepare('SELECT * FROM purchases ORDER BY seq').all().map(row=>this.observation(row));}
  events(){return this.db.prepare('SELECT seq,key,kind FROM provider_events ORDER BY seq').all();}
  close(){this.db.close();}
}
