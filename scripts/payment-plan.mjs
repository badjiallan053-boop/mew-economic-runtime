import {validatePaymentPlan,paymentRecovery,syntheticPaymentPlan} from '../src/company/payment-plan.mjs';

// No credential access, file input, network or external effects.
const contract=syntheticPaymentPlan();
console.log(JSON.stringify({mode:'synthetic-offline-example',addressValidity:'NOT_BECH32_VERIFIED_NOT_USABLE_FOR_PAYMENT',plan:validatePaymentPlan(contract),timeout:paymentRecovery(contract,{outcome:'TIMEOUT'})},null,2));
