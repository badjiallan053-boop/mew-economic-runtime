import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MEW } from '../core/mew.mjs';

export class Store {
  constructor(path, {mode='demo',maxSnapshotBytes=mode==='demo'?2*1024*1024:64*1024*1024}={}) {
    if(!['demo','live'].includes(mode)) throw new Error('Invalid ledger mode');
    if(!Number.isSafeInteger(maxSnapshotBytes) || maxSnapshotBytes<1024) throw new Error('Invalid storage budget');
    this.maxSnapshotBytes=maxSnapshotBytes;
    this.mode=mode;
    if(path !== ':memory:') mkdirSync(dirname(path), { recursive:true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.exec('CREATE TABLE IF NOT EXISTS campaign (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.exec('CREATE TABLE IF NOT EXISTS rehearsal (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.prepare('INSERT OR IGNORE INTO runtime VALUES (1, ?)').run(JSON.stringify(new MEW().snapshot()));
    this.db.exec('CREATE TABLE IF NOT EXISTS ledger_metadata (id INTEGER PRIMARY KEY CHECK(id=1), mode TEXT NOT NULL); BEGIN IMMEDIATE;');
    try {
      const saved=this.db.prepare('SELECT mode FROM ledger_metadata WHERE id=1').get();
      if(saved && saved.mode!==mode) throw new Error('Ledger mode mismatch: use a separate database for live and demo');
      if(!saved && mode==='live') {
        const existing=this.read().snapshot();
        if(Object.values(existing).some(v=>Array.isArray(v) && v.length) || this.readRehearsal() || this.readCampaign()) throw new Error('Unclassified ledger cannot enter live mode: use a fresh database');
      }
      this.db.prepare('INSERT OR IGNORE INTO ledger_metadata VALUES (1, ?)').run(mode);
      this.db.exec('COMMIT');
    } catch(error) {this.db.exec('ROLLBACK');this.db.close();throw error;}
    this.db.exec('CREATE TABLE IF NOT EXISTS cardano_operations (id TEXT PRIMARY KEY, effect_id TEXT NOT NULL UNIQUE, tx_hash TEXT NOT NULL UNIQUE, record TEXT NOT NULL);');
  }
  cardanoOperations() {return this.db.prepare('SELECT record FROM cardano_operations ORDER BY rowid').all().map(row=>JSON.parse(row.record));}
  cardanoOperation(effectId) {const row=this.db.prepare('SELECT record FROM cardano_operations WHERE effect_id=?').get(effectId);return row?JSON.parse(row.record):null;}
  bindCardanoOperation(input) {
    if(this.mode!=='live') throw new Error('Cardano operation binding requires live mode');
    for(const field of ['id','effectId','submissionRef']) if(typeof input?.[field]!=='string' || !input[field].trim() || input[field].length>512) throw new Error(`Invalid operation ${field}`);
    if(typeof input.txHash!=='string' || !/^[a-f0-9]{64}$/i.test(input.txHash)) throw new Error('Invalid operation transaction hash');
    const hash=input.txHash.toLowerCase();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const effect=this.read().snapshot().effects.find(e=>e.id===input.effectId);
      if(!effect || effect.type!=='payment' || !Number.isSafeInteger(effect.amount) || effect.amount<=0 || !effect.recipientAddress?.startsWith('addr_test1')) throw new Error('Operation requires a reserved preprod payment contract');
      const record={id:input.id,effectId:effect.id,objectiveId:effect.objectiveId,network:'cardano:preprod',txHash:hash,submissionRef:input.submissionRef,recipientAddress:effect.recipientAddress,amount:effect.amount};
      const existing=this.db.prepare('SELECT record FROM cardano_operations WHERE id=? OR effect_id=?').get(input.id,effect.id);
      if(existing) {const saved=JSON.parse(existing.record);const {createdAt,...contract}=saved;if(JSON.stringify(contract)!==JSON.stringify(record)) throw new Error('Cardano operation contract is immutable');this.db.exec('COMMIT');return saved;}
      if(!['reserved','committed'].includes(effect.status)) throw new Error('Cannot bind a terminal effect');
      if(this.db.prepare('SELECT id FROM cardano_operations WHERE tx_hash=?').get(hash) || this.read().snapshot().claims.some(c=>c.evidence?.txHash?.toLowerCase()===hash)) throw new Error('Transaction already attributed');
      record.createdAt=new Date().toISOString();
      const serialized=this.serialize(record);
      const used=this.db.prepare('SELECT COALESCE(SUM(length(CAST(record AS BLOB))),0) AS bytes FROM cardano_operations').get().bytes;
      if(used+Buffer.byteLength(serialized)>this.maxSnapshotBytes) throw new Error('Operation storage budget exceeded');
      this.db.prepare('INSERT INTO cardano_operations VALUES(?,?,?,?)').run(record.id,effect.id,hash,serialized);
      this.db.exec('COMMIT');return record;
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
  }
  serialize(value) {
    const snapshot=JSON.stringify(value);
    if(Buffer.byteLength(snapshot)>this.maxSnapshotBytes) throw new Error('Ledger storage budget exceeded; mutation rolled back');
    return snapshot;
  }
  read() { return new MEW(JSON.parse(this.db.prepare('SELECT snapshot FROM runtime WHERE id=1').get().snapshot)); }
  transact(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const kernel=this.read();
      const result=fn(kernel);
      if(result?.then) throw new Error('Transactions must be synchronous');
      this.db.prepare('UPDATE runtime SET snapshot=? WHERE id=1').run(this.serialize(kernel.snapshot()));
      this.db.exec('COMMIT'); return result;
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  reset(objective) {
    return this.transact(k=>{k.state=new MEW().snapshot();k.createObjective(objective);return k.snapshot();});
  }
  readRehearsal() {
    const row=this.db.prepare('SELECT snapshot FROM rehearsal WHERE id=1').get();
    return row ? JSON.parse(row.snapshot) : null;
  }
  rehearse(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result=fn(this.readRehearsal());
      if(result?.then) throw new Error('Transactions must be synchronous');
      this.db.prepare('INSERT INTO rehearsal VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot').run(this.serialize(result));
      this.db.exec('COMMIT'); return result;
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  readCampaign() {
    const row=this.db.prepare('SELECT snapshot FROM campaign WHERE id=1').get();
    return row?JSON.parse(row.snapshot):null;
  }
  campaign(fn) {
    if(this.mode!=='demo') throw new Error('Campaign fixtures require demo mode');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result=fn(this.readCampaign());
      if(result?.then) throw new Error('Transactions must be synchronous');
      this.db.prepare('INSERT INTO campaign VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot').run(this.serialize(result));
      this.db.exec('COMMIT');return result;
    }catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  close() { this.db.close(); }
}
