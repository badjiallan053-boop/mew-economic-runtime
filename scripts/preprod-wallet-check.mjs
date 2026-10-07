import {observePreprodWallet} from '../src/integration/preprod-wallet.mjs';
// Address is public; credentials come only from server environment. Never print errors
// originating in transport because provider messages can contain confidential data.
try{const address=process.argv[2];if(process.argv.length!==3)throw Error('Usage');console.log(JSON.stringify(await observePreprodWallet({address}),null,2));}
catch{console.error('Preprod wallet observation blocked. Check public address, server configuration and provider availability. No signing or dispatch attempted.');process.exitCode=1;}
