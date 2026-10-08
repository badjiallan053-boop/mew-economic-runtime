import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEventListing} from '../src/learning/events.mjs';
const e={platform:'luma',id:'event-1',title:'Fixture event',url:'https://lu.ma/example',startsAt:'2026-10-08T10:00:00+08:00'},now='2026-10-07T00:00:00Z';
test('event listing preserves timezone and does not imply attendance, payment or training permission',()=>{const r=normalizeEventListing(e,now);assert.equal(r.startsAt,'2026-10-08T02:00:00.000Z');assert.equal(r.attendanceVerified,false);assert.equal(r.trainingEligible,false);assert.equal(r.paymentAttribution,'UNKNOWN');});
test('event metadata rejects redirected identity, credentials and ambiguous times',()=>{for(const url of ['https://lu.ma.attacker.example/event','https://user:password@lu.ma/event','https://lu.ma/event?apikey=example'])assert.throws(()=>normalizeEventListing({...e,url},now));assert.throws(()=>normalizeEventListing({...e,startsAt:'2026-10-08T10:00:00'},now));assert.throws(()=>normalizeEventListing({...e,endsAt:'2026-10-08T01:00:00Z'},now));});

test('unpermissioned historical Eventbrite imports and timezone-free ends are refused',()=>{assert.throws(()=>normalizeEventListing({...e,platform:'eventbrite',url:'https://www.eventbrite.com/e/example',startsAt:'2026-10-01T00:00:00Z'},now),/Past/);assert.throws(()=>normalizeEventListing({...e,endsAt:'2026-10-09T00:00:00'},now));});
