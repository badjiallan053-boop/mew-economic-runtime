import { verifyTokenReceipt } from './token-receipt.mjs';

/** Read-only proof. Contract must come from trusted, saved payment terms, never
 * browser input. This does not authorize spending or prove delivered quality. */
export async function verifyMasumiCollection({contract,readTaskReceipt,resolvePayment,verifyChain=verifyTokenReceipt}) {
  const c=contract;
  for(const key of ['taskId','blockchainIdentifier','agentIdentifier','walletId','sellerAddress','smartContractAddress','unit','expectedAmount'])
    if(typeof c?.[key]!=='string'||!c[key].length)throw new Error(`Missing trusted contract field: ${key}`);
  if(c.network!=='Preprod'||c.paymentSourceType!=='Web3CardanoV2')throw new Error('Require preprod Cardano V2 contract');
  if(!/^[1-9][0-9]{0,19}$/.test(c.expectedAmount))throw new Error('Invalid atomic amount');
  const receipt=await readTaskReceipt(c.taskId);
  if(receipt?.blockchainIdentifier!==c.blockchainIdentifier)throw new Error('Task payment identity mismatch');
  if(receipt.settled!==true||!receipt.txHash)return {verified:false,status:'PENDING_COLLECTION',taskId:c.taskId};
  if(!/^[a-f0-9]{64}$/.test(receipt.txHash))throw new Error('Invalid receipt transaction');
  const payment=await resolvePayment(c.blockchainIdentifier);
  const source=payment?.PaymentSource,wallet=payment?.SmartContractWallet;
  if(payment?.blockchainIdentifier!==c.blockchainIdentifier||payment.agentIdentifier!==c.agentIdentifier||source?.network!==c.network||source.paymentSourceType!==c.paymentSourceType||source.smartContractAddress!==c.smartContractAddress||wallet?.id!==c.walletId||wallet.walletAddress!==c.sellerAddress)throw new Error('MPS contract binding mismatch');
  const funds=payment.RequestedFunds;
  if(!Array.isArray(funds)||funds.length!==1||funds[0].unit!==c.unit||funds[0].amount!==c.expectedAmount)throw new Error('Requested asset or amount mismatch');
  const transactions=[payment.CurrentTransaction,...(Array.isArray(payment.TransactionHistory)?payment.TransactionHistory:[])];
  if(!transactions.some(tx=>tx?.txHash===receipt.txHash&&tx.status==='Confirmed'&&tx.newOnChainState==='Withdrawn'))throw new Error('No confirmed ordinary seller withdrawal');
  const proof=await verifyChain({txHash:receipt.txHash,sellerAddress:c.sellerAddress,unit:c.unit,expectedAmount:c.expectedAmount});
  if(proof?.verified!==true||proof.simulated!==false||proof.network!=='cardano:preprod'||proof.txHash!==receipt.txHash||proof.sellerAddress!==c.sellerAddress||proof.unit!==c.unit||proof.expectedAtomicUnits!==c.expectedAmount)throw new Error('Chain proof binding mismatch');
  return {...proof,taskId:c.taskId,blockchainIdentifier:c.blockchainIdentifier,binding:'authenticated-task-mps-contract',status:'COLLECTED'};
}
