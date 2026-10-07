import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../scripts/collect-ecosystem.mjs';
test('ecosystem records preserve grain and reject malformed evidence',()=>{
 assert.throws(()=>normalize({kind:'chain'},[{block_no:'123',abs_slot:1}]));
 assert.throws(()=>normalize({kind:'indicator'},[{pages:1},[{value:101}]]));
 const rows=normalize({kind:'indicator',url:'fixture'},[{pages:1},[{value:null},{value:90,countryiso3code:'SGP',date:'2024',indicator:{id:'IT.NET.USER.ZS'}}]]);
 assert.equal(rows.length,1);assert.equal(rows[0].grain,'country_year');assert.equal(rows[0].unit,'percent_population');
 assert.throws(()=>normalize({kind:'repository'},{}));
});

test('incomplete pages and malformed keys fail closed',()=>{
 assert.throws(()=>normalize({kind:'indicator'},[{pages:2},[]]));
 assert.throws(()=>normalize({kind:'indicator'},[{pages:1},[{value:90,countryiso3code:'unknown',date:'2024',indicator:{id:'IT.NET.USER.ZS'}}]]));
 assert.throws(()=>normalize({kind:'chain'},[{block_no:-1,abs_slot:1,block_time:1}]));
 assert.throws(()=>normalize({kind:'repository',id:'expected/repo'},{full_name:'other/repo',html_url:'https://github.com/other/repo'}));
});
