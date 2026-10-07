import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const candidates=[
 ['datasets','nvidia/When2Call','Tool use and justified abstention','priority-review'],
 ['datasets','Salesforce/xlam-function-calling-60k','Structured function arguments','gated-review'],
 ['datasets','HuggingFaceH4/ultrafeedback_binarized','Generic preference tuning; lower domain fit','secondary-review'],
 ['datasets','vibrantlabsai/fiqa','Financial retrieval benchmark','share-alike-review'],
 ['datasets','PatronusAI/financebench','Financial evidence benchmark','exclude-commercial-training'],
 ['datasets','allenai/scifact','Claim verification benchmark','exclude-commercial-training'],
 ['models','Qwen/Qwen3-4B-Instruct-2507','Candidate advisory language model','evaluate-before-training'],
 ['models','Qwen/Qwen3-Embedding-0.6B','Candidate retrieval encoder','evaluate-before-training']
];
const directory=`research/model-hunt/${new Date().toISOString().replaceAll(':','-').replaceAll('.','-')}`;
await mkdir(directory,{recursive:true});const results=[];
for(const [kind,id,task,decision] of candidates){
 const url=`https://huggingface.co/api/${kind}/${id}`;const result={kind,id,task,decision,url,trainingEligible:false};
 try{
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`HTTP ${response.status}`);
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1048576)throw Error('Metadata exceeds limit');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
  const raw=Buffer.concat(chunks),data=JSON.parse(raw);if(data.id!==id||! /^[a-f0-9]{40}$/.test(data.sha))throw Error('Unpinned or substituted repository');
  result.status='collected';result.revision=data.sha;result.license=data.cardData?.license??null;result.gated=data.gated??false;result.collectedAt=new Date().toISOString();result.sha256=createHash('sha256').update(raw).digest('hex');result.file=id.replaceAll('/','--')+'.json';
  await writeFile(`${directory}/${result.file}`,raw,{flag:'wx'});
 }catch(error){result.status='unavailable';result.reason=error.message;}
 results.push(result);
}
await writeFile(`${directory}/catalog.json`,JSON.stringify({schema:'mew.model-hunt.v1',metadataOnly:true,weightsDownloaded:false,externalTrainingPerformed:false,candidates:results},null,2)+'\n');console.log(JSON.stringify({directory,collected:results.filter(r=>r.status==='collected').length,unavailable:results.filter(r=>r.status!=='collected').length},null,2));
