import { mkdirSync,chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store } from '../src/server/store.mjs';
import { StripeSandboxProvider } from '../src/adapters/stripe-sandbox.mjs';
import { StripeInbox } from '../src/adapters/stripe-webhook.mjs';
import { createStripeReceiver } from '../src/server/stripe-receiver.mjs';

if(process.argv.length!==2)throw new Error('Listener accepts no flags');
const secret=process.env.STRIPE_SANDBOX_WEBHOOK_SECRET;
if(!/^whsec_[A-Za-z0-9]{8,}$/.test(secret??''))throw new Error('Sandbox webhook signing secret required');
const dir=resolve('private-pilot/stripe');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
const provider=new StripeSandboxProvider(resolve(dir,'stripe.sqlite'),{key:process.env.STRIPE_SANDBOX_KEY,accountId:process.env.STRIPE_SANDBOX_ACCOUNT_ID});
const store=new Store(resolve(dir,'runtime.sqlite')),inbox=new StripeInbox(store,provider);
const server=createStripeReceiver(inbox,[secret]);
let working=false,stopping=false;
async function drain(){if(working||stopping)return;working=true;try{for(let i=0;i<10&&!stopping;i++)if(!await inbox.tick())break;}catch{console.error('Sandbox reconciliation requires retry or operator review');}finally{working=false;}}
const interval=setInterval(drain,1000);
server.listen(3001,'127.0.0.1',()=>{console.log('Sandbox webhook inbox: http://127.0.0.1:3001/stripe/webhook');void drain();});
server.on('error',()=>{console.error('Sandbox listener unavailable');process.exitCode=1;void stop();});
async function stop(){if(stopping)return;stopping=true;clearInterval(interval);await new Promise(r=>server.close(r));while(working)await new Promise(r=>setTimeout(r,50));store.close();provider.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
