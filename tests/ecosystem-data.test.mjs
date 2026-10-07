import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../scripts/collect-ecosystem.mjs';
test('ecosystem records preserve grain and reject malformed evidence',()=>{
 assert.throws(()=>normalize({kind:'chain'},[{block_no:'123',abs_slot:1}]));
 assert.throws(()=>normalize({kind:'indicator'},[{},[{value:101}]]));
 const rows=normalize({kind:'indicator',url:'fixture'},[{},[{value:null},{value:90,countryiso3code:'SGP',date:'2024'}]]);
 assert.equal(rows.length,1);assert.equal(rows[0].grain,'country_year');assert.equal(rows[0].unit,'percent_population');
 assert.throws(()=>normalize({kind:'repository'},{}));
});
