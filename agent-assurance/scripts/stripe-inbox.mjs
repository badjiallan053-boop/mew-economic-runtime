import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store } from '../src/server/store.mjs';
import { inboxStatus,retryInboxReview } from '../src/adapters/stripe-webhook.mjs';

const args=process.argv.slice(2),path=resolve('private-pilot/stripe/runtime.sqlite');
if(!(args.length===1&&args[0]==='--status'||args.length===2&&args[0]==='--retry'))throw new Error('Use --status or --retry EVENT_ID');
if(!existsSync(path))throw new Error('No existing sandbox journal');
const store=new Store(path);
try {
  if(!store.db.prepare("SELECT name FROM sqlite_master WHERE name='stripe_inbox_recovery'").get())throw new Error('Start the sandbox listener to initialize its inbox');
  console.log(JSON.stringify(args[0]==='--status'?{simulated:true,events:inboxStatus(store)}:retryInboxReview(store,args[1]),null,2));
} finally {store.close();}
