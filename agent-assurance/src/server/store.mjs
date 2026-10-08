import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MEW } from '../core/mew.mjs';

export class Store {
  constructor(path) {
    if(path !== ':memory:') mkdirSync(dirname(path), { recursive:true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL);');
    this.db.prepare('INSERT OR IGNORE INTO runtime VALUES (1, ?)').run(JSON.stringify(new MEW().snapshot()));
  }
  read() { return new MEW(JSON.parse(this.db.prepare('SELECT snapshot FROM runtime WHERE id=1').get().snapshot)); }
  transact(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const kernel=this.read();
      const result=fn(kernel);
      if(result?.then) throw new Error('Transactions must be synchronous');
      this.db.prepare('UPDATE runtime SET snapshot=? WHERE id=1').run(JSON.stringify(kernel.snapshot()));
      this.db.exec('COMMIT'); return result;
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  reset(objective) {
    return this.transact(k=>{k.state=new MEW().snapshot();k.createObjective(objective);return k.snapshot();});
  }
  close() { this.db.close(); }
}
