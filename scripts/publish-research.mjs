import {readFile,writeFile} from 'node:fs/promises';
const quality=JSON.parse(await readFile('research/ecosystem/quality.json','utf8'));
const manifest=JSON.parse(await readFile('research/ecosystem/manifest.json','utf8'));
const news=JSON.parse(await readFile('research/ecosystem/news.json','utf8'));
const snapshot={mode:'public-data-observations; no live model or payments',quality,sources:manifest.map(({id,url,status,records,retrievedAt})=>({id,url,status,records,retrievedAt})),announcements:news};
await writeFile('public/research-snapshot.json',JSON.stringify(snapshot,null,2)+'\n');
console.log('Published bounded read-only research snapshot');
