import {startOperatorHost} from '../src/server/operator-host.mjs';
// Only private paths are supplied on the command line, never bearer tokens.
try{
 if(process.argv.length!==4)throw Error('Usage');
 const host=await startOperatorHost({configPath:process.argv[2],dbPath:process.argv[3]});
 console.log(`Private operator host listening on 127.0.0.1:${host.port}; payments disabled`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{host.close().then(()=>{process.exitCode=0;});});
}catch{console.error('Operator startup failed. Check private configuration, provisioned live ledger and local port.');process.exitCode=1;}
