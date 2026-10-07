const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function link(url){const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('Unsafe source URL');const a=el('a','Primary source');a.href=url;a.rel='noopener noreferrer';return a;}
try{
 const r=await fetch('/research-snapshot.json');if(!r.ok)throw Error('Snapshot unavailable');const s=await r.json();
 document.querySelector('#status').textContent=`Snapshot ${s.quality.retrievedAt}: ${s.quality.records} API records, ${s.quality.sourcesSucceeded} successful sources, ${s.quality.sourcesFailed} unavailable. Model processing remains simulated.`;
 for(const row of s.sources){const a=el('article','');a.append(el('strong',row.id),el('p',`${row.status} · ${row.records} records · retrieved ${row.retrievedAt}`),link(row.url));document.querySelector('#sources').append(a);}
 for(const row of s.announcements){const a=el('article','');a.append(el('strong',row.id),el('p',row.summary),el('small',`${row.publishedAt} · ${row.classification} · manually curated`),el('br',''),link(row.source));document.querySelector('#news').append(a);}
}catch{document.querySelector('#status').textContent='Research snapshot unavailable. No substitute evidence was generated.';}
