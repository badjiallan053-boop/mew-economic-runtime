import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../public/insurance.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/insurance.css', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../public/site-shell.js', import.meta.url), 'utf8');
const seo = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');

test('insurance explainer distinguishes MEW controls from an insurer coverage decision', () => {
  assert.match(html, /no insurance offered/);
  assert.match(html, /It does not mean a broker accepts the risk, a policy covers an event, or a claim will be paid/);
  assert.match(html, /no payment occurred/);
  assert.match(html, /does not authenticate the underlying facts/);
  assert.match(html, /Quote, bind or administer insurance/);
});

test('insurance concept is reachable, indexed as an explainer and responsive', () => {
  assert.match(shell, /\['insurance\.html','Agent insurance'\]/);
  assert.match(seo, /https:\/\/mew-demo-production\.up\.railway\.app\/insurance\.html/);
  assert.match(html, /aria-labelledby="boundary-title"/);
  assert.match(html, /href="\/cream-motion\.css\?v=cream-20261008f"/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('ecosystem handoffs keep operator, MEW, rail, supplier and insurer facts separate', () => {
  assert.match(html, /aria-label="Evidence and authority handoffs"/);
  for (const label of ['Operator mandate', 'MEW decision', 'Cardano observation', 'Supplier delivery', 'Partner decision']) {
    assert.ok(html.includes(label), `missing ecosystem handoff: ${label}`);
  }
  assert.match(html, /a transaction hash does not prove delivery/);
  assert.match(html, /No live signing, payment, policy or claim decision is available/);
  assert.match(css, /\.ecosystem-map/);
});
