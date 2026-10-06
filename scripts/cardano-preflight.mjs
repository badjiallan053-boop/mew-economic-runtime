import { checkCardanoConnection } from '../src/adapters/cardano-connection.mjs';
const status=await checkCardanoConnection();
console.log(JSON.stringify(status,null,2));
process.exitCode=status.connected?0:1;
