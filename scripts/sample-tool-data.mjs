import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='0582f7749df63a96fdc3070932e83e72396ace53';
const url=`https://huggingface.co/datasets/nvidia/When2Call/resolve/${revision}/train/when2call_train_sft.jsonl`;
const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`HTTP ${response.status}`);
const reader=response.body.getReader(),decoder=new TextDecoder(),rows=[];let pending='',bytes=0;
try{
 while(rows.length<32){
  const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2097152)throw Error('Sample exceeds 2 MiB');pending+=decoder.decode(value,{stream:true});
  while(pending.includes('\n')&&rows.length<32){const end=pending.indexOf('\n'),line=pending.slice(0,end);pending=pending.slice(end+1);if(!line.trim())continue;
   if(Buffer.byteLength(line)>131072)throw Error('Oversized example');const row=JSON.parse(line);if(!Array.isArray(row.messages)||!Array.isArray(row.tools))throw Error('Unexpected training schema');rows.push(row);
  }
 }
}finally{await reader.cancel();}
if(rows.length!==32)throw Error('Incomplete sample');
const content=rows.map(row=>JSON.stringify(row)).join('\n')+'\n',directory=`research/model-hunt/when2call-sample-${new Date().toISOString().replaceAll(':','-').replaceAll('.','-')}`;await mkdir(directory,{recursive:true});
await writeFile(`${directory}/sample.jsonl`,content,{flag:'wx'});await writeFile(`${directory}/manifest.json`,JSON.stringify({dataset:'nvidia/When2Call',revision,source:url,sourceSplit:'train_sft/train',sampleMethod:'First 32 records; convenience sample, not representative',records:32,license:'cc-by-4.0',attribution:'NVIDIA Corporation; Ross, Mahabaleshwarka and Suhara, When2Call, NAACL 2025',synthetic:true,trainingEligible:false,review:'Pending domain, privacy, tool-authority and attribution review. No tools executed.',sha256:createHash('sha256').update(content).digest('hex'),hashScope:'Retained sample bytes only; not full upstream file',collectedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({directory,records:rows.length,trainingPerformed:false}));
