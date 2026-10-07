import {DatabaseSync,backup} from 'node:sqlite';
import {mkdtempSync,rmSync,linkSync,chmodSync,readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {MEW} from '../core/mew.mjs';
import {inspectEscrowJournal} from './escrow-backup.mjs';

const fingerprint=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
/** Trusted operator paths only. Integrity is structural, not proof of freshness,
 * authenticity, or permission to resume spending. */
export function inspectBackup(path,{expectedDigest}={}){
  if(expectedDigest!==undefined&&(typeof expectedDigest!=='string'||!/^[a-f0-9]{64}$/.test(expectedDigest)||fingerprint(path)!==expectedDigest))throw Error('Backup digest mismatch');
  const db=new DatabaseSync(path,{readOnly:true});
  try{
    const rows=db.prepare('PRAGMA integrity_check').all();
    if(rows.length!==1||Object.values(rows[0])[0]!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup integrity check failed');
    const mode=db.prepare('SELECT mode FROM ledger_metadata WHERE id=1').get()?.mode;
    if(!['demo','live'].includes(mode))throw Error('Backup ledger mode missing');
    const raw=db.prepare('SELECT snapshot FROM runtime WHERE id=1').get()?.snapshot;
    if(!raw)throw Error('Backup ledger missing');
    const k=new MEW(JSON.parse(raw)),snapshot=k.snapshot();
    const hasOutbox=!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_outbox'").get();
    const operations=hasOutbox?db.prepare('SELECT id,effect_id,status FROM payment_outbox ORDER BY id').all().map(r=>({operationId:r.id,effectId:r.effect_id,status:r.status})):[];
    if(operations.some(o=>!['READY','DISPATCHING','UNKNOWN','ACKNOWLEDGED'].includes(o.status)||!snapshot.effects.some(e=>e.id===o.effectId)))throw Error('Backup operation binding invalid');
    const positions=snapshot.objectives.map(o=>k.position(o.id));
    if(positions.some(p=>!Number.isSafeInteger(p.exposure)||p.exposure<0||p.remainingBudget<0))throw Error('Backup exposure invalid');
    const escrowOperations=inspectEscrowJournal(db,snapshot);
    return {integrity:'ok',mode,positions,operations,escrowOperations,dispatchAllowed:false,retrySpendAllowed:false,releaseExposureAllowed:false,reconciliationRequired:true};
  }finally{db.close();}
}

/** SQLite online backup captures committed WAL state. Publish without overwriting
 * existing destinations; never raw-copy an open database file. */
export async function createBackup(sourceDb,destination){
  if(!(sourceDb instanceof DatabaseSync)||typeof destination!=='string'||!destination.trim())throw Error('Open SQLite source and trusted destination required');
  const target=resolve(destination),dir=mkdtempSync(join(dirname(target),'.mew-backup-'));
  try{
    const staged=join(dir,'snapshot.sqlite');
    await backup(sourceDb,staged);chmodSync(staged,0o600);
    const inspection=inspectBackup(staged),sha256=fingerprint(staged);
    linkSync(staged,target); // exclusive publication, including symlink targets
    return {version:1,createdAt:new Date().toISOString(),sha256,...inspection};
  }finally{rmSync(dir,{recursive:true,force:true});}
}

/** Restores only into a temporary isolated database and returns observations.
 * No active store, worker token, callback, or restored path is exposed. */
export async function restoreDrill(path,{expectedDigest}={}){
  inspectBackup(path,{expectedDigest});
  const dir=mkdtempSync(join(tmpdir(),'mew-restore-drill-'));
  let source;
  try{
    source=new DatabaseSync(path,{readOnly:true});
    const restored=join(dir,'isolated.sqlite');
    await backup(source,restored);chmodSync(restored,0o600);
    const inspection=inspectBackup(restored);
    return {version:1,isolatedRestoreVerified:true,...inspection,activationAllowed:false,limitations:['An old backup can omit externally dispatched work.','Freeze old writers and reconcile every operation before any active restoration.','SQLite integrity is not payment or delivery proof.']};
  }finally{source?.close();rmSync(dir,{recursive:true,force:true});}
}
