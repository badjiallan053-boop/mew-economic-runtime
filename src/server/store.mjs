import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MEW } from '../core/mew.mjs';

export class Store {
  constructor(path, {mode='demo',maxSnapshotBytes=mode==='demo'?2*1024*1024:64*1024*1024}={}) {
    if(!['demo','live'].includes(mode)) throw new Error('Invalid ledger mode');
    if(!Number.isSafeInteger(maxSnapshotBytes) || maxSnapshotBytes<1024) throw new Error('Invalid storage budget');
    this.maxSnapshotBytes=maxSnapshotBytes;
    if(path !== ':memory:') mkdirSync(dirname(path), { recursive:true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.exec('CREATE TABLE IF NOT EXISTS rehearsal (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.prepare('INSERT OR IGNORE INTO runtime VALUES (1, ?)').run(JSON.stringify(new MEW().snapshot()));
    this.db.exec('CREATE TABLE IF NOT EXISTS ledger_metadata (id INTEGER PRIMARY KEY CHECK(id=1), mode TEXT NOT NULL); BEGIN IMMEDIATE;');
    try {
      const saved=this.db.prepare('SELECT mode FROM ledger_metadata WHERE id=1').get();
      if(saved && saved.mode!==mode) throw new Error('Ledger mode mismatch: use a separate database for live and demo');
      if(!saved && mode==='live') {
        const existing=this.read().snapshot();
        if(Object.values(existing).some(v=>Array.isArray(v) && v.length) || this.readRehearsal()) throw new Error('Unclassified ledger cannot enter live mode: use a fresh database');
      }
      this.db.prepare('INSERT OR IGNORE INTO ledger_metadata VALUES (1, ?)').run(mode);
      this.db.exec('COMMIT');
    } catch(error) {this.db.exec('ROLLBACK');this.db.close();throw error;}
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
  close() { this.db.close(); }
}
