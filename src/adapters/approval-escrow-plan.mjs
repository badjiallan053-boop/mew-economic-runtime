import {createHash} from 'node:crypto';
import {bech32} from '@scure/base';
const SCRIPT_HASH='b4f05c52f35ff19f653540cd9e3f4cd36ee420ad894ad503ab2039c7';
const PROTOCOL=Object.freeze({version:1,plutusVersion:3,scriptHash:SCRIPT_HASH,blueprintSha256:'abe6547ac833a48772ce6e07e9a1071a2e1d6928e9c103195390e88e9474249f',scriptAddress:bech32.encode('addr_test',bech32.toWords(Uint8Array.from([0x70,...Buffer.from(SCRIPT_HASH,'hex')])),200)});
const sha=value=>createHash('sha256').update(value).digest('hex');
const constr=(constructor,fields)=>({constructor,fields});
const bytes=hex=>({bytes:hex});
/** Strict CIP-19 subset: key-payment base/enterprise testnet addresses only. */
export function decodeEscrowAddress(address){
 if(typeof address!=='string'||address!==address.toLowerCase()||address.length>200)throw Error('Invalid escrow address');
 const decoded=bech32.decode(address,200);if(decoded.prefix!=='addr_test')throw Error('Testnet address required');
 const raw=Buffer.from(bech32.fromWords(decoded.words)),kind=raw[0]>>>4,network=raw[0]&15;
 if(network!==0||![0,2,6].includes(kind)||raw.length!==(kind===6?29:57))throw Error('Unsupported address credentials or network');
 if(bech32.encode(decoded.prefix,bech32.toWords(raw),200)!==address)throw Error('Noncanonical address');
 const paymentKeyHash=raw.subarray(1,29).toString('hex'),stake=kind===6?null:{kind:kind===0?'key':'script',hash:raw.subarray(29).toString('hex')};
 const payment=constr(0,[bytes(paymentKeyHash)]),stakeData=stake?constr(0,[constr(0,[constr(stake.kind==='key'?0:1,[bytes(stake.hash)])])]):constr(1,[]);
 return {address,paymentKeyHash,stake,plutusData:constr(0,[payment,stakeData]),testnetOnly:true,networkMagicProven:false};
}
const fields=['network','objectiveId','effectId','semanticKey','principalAddress','providerAddress','artifactSha256','nonceHex','amountLovelace','fundingFeeBudgetLovelace','closingFeeBudgetLovelace','collateralExposureLovelace','maxExposureLovelace','minimumOutputLovelace'];
export function planApprovalEscrow(input){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).length!==fields.length||fields.some(k=>!Object.hasOwn(input,k)||!Object.getOwnPropertyDescriptor(input,k)?.hasOwnProperty('value')))throw Error('Invalid escrow intent fields');
 if(input.network!=='cardano:preprod')throw Error('Preprod only');
 for(const k of ['objectiveId','effectId','semanticKey'])if(typeof input[k]!=='string'||!/^[A-Za-z0-9._:@/-]{1,200}$/.test(input[k]))throw Error('Invalid intent identity');
 for(const k of ['artifactSha256','nonceHex'])if(typeof input[k]!=='string'||!/^([a-f0-9]{64})$/.test(input[k]))throw Error('Invalid commitment');
 for(const k of ['amountLovelace','fundingFeeBudgetLovelace','closingFeeBudgetLovelace','collateralExposureLovelace','maxExposureLovelace','minimumOutputLovelace'])if(!Number.isSafeInteger(input[k])||input[k]<=0)throw Error('Positive integer lovelace required');
 if(input.amountLovelace<input.minimumOutputLovelace||BigInt(input.amountLovelace)+BigInt(input.fundingFeeBudgetLovelace)+BigInt(input.closingFeeBudgetLovelace)+BigInt(input.collateralExposureLovelace)>BigInt(input.maxExposureLovelace))throw Error('Full funding/fee budget exceeds mandate or minimum output');
 const principal=decodeEscrowAddress(input.principalAddress),provider=decodeEscrowAddress(input.providerAddress);
 if(principal.paymentKeyHash===provider.paymentKeyHash)throw Error('Distinct principal and provider payment keys required');
 const objectiveDigest=sha(JSON.stringify(['MEW escrow objective v1',input.network,input.objectiveId,input.semanticKey,input.nonceHex]));
 const effectDigest=sha(JSON.stringify(['MEW escrow effect v1',objectiveDigest,input.effectId,input.nonceHex]));
 const datum=constr(0,[{int:1},principal.plutusData,provider.plutusData,bytes(objectiveDigest),bytes(effectDigest),bytes(input.artifactSha256)]);
 const intentBytes=JSON.stringify(['MEW escrow funding intent v1',PROTOCOL.scriptHash,PROTOCOL.blueprintSha256,PROTOCOL.scriptAddress,...fields.map(k=>input[k])]);
 return {schema:'mew.approval-escrow-plan.v1',network:input.network,protocol:{...PROTOCOL},intentSha256:sha(intentBytes),objectiveDigest,effectDigest,datum,redeemers:{accept:constr(0,[bytes(input.artifactSha256)]),cancel:constr(1,[])},signers:{accept:[principal.paymentKeyHash,provider.paymentKeyHash],cancel:[principal.paymentKeyHash]},funding:{escrowLovelace:input.amountLovelace,fundingFeeReserveLovelace:input.fundingFeeBudgetLovelace,closingFeeReserveLovelace:input.closingFeeBudgetLovelace,collateralExposureLovelace:input.collateralExposureLovelace,totalExposureLovelace:input.amountLovelace+input.fundingFeeBudgetLovelace+input.closingFeeBudgetLovelace+input.collateralExposureLovelace},requiredPayouts:{accept:{address:provider.address,lovelace:input.amountLovelace},cancel:{address:principal.address,lovelace:input.amountLovelace}},dispatchAllowed:false,trainingAuthorized:false,globalMandateEnforcedOnChain:false,blockers:['External wallet and trusted funding operation required','Reserve funding and separate fee exposure transactionally; do not reuse a direct-payment reservation as escrow settlement','Minimum UTxO must be calculated from actual serialized datum/output and fresh preprod parameters','Testnet address encoding cannot distinguish preprod from preview','Unbroadcast prototype requires independent audit and preprod lifecycle rehearsal']};
}
