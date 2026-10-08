import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const publicDir = new URL('../public/', import.meta.url);
const css = readFileSync(new URL('../public/cream-motion.css', import.meta.url), 'utf8');
const pages = readdirSync(publicDir).filter(name => name.endsWith('.html'));

test('every shipped page loads the shared cream theme and browser chrome uses its canvas', () => {
  assert.ok(pages.length > 0);
  for (const page of pages) {
    const html = readFileSync(new URL(`../public/${page}`, import.meta.url), 'utf8');
    assert.match(html, /href="\/cream-motion\.css\?v=cream-20261008e"/, `${page} misses shared theme`);
    assert.match(html, /name="theme-color" content="#f6f2e9"/, `${page} has mismatched browser chrome`);
  }
});

test('cream pages keep legacy cards, saved records and disabled controls readable', () => {
  assert.match(css, /body\.company-page \.metrics[\s\S]*?background: var\(--surface\)/);
  assert.match(css, /body\.design-studio-page #critique article[\s\S]*?background: var\(--surface\)/);
  assert.match(css, /body\.site-page \.brief-panel pre[\s\S]*?color: var\(--ink\)/);
  assert.match(css, /#download-brief:disabled[\s\S]*?opacity: 1/);
  assert.match(css, /--type-body:\s*1rem/);
  assert.match(css, /--type-caption:\s*\.8125rem/);
});

test('pilot starts with a clear action and keeps its destination attached to the workflow', () => {
  const html = readFileSync(new URL('../public/pilot.html', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../public/pilot.js', import.meta.url), 'utf8');
  assert.match(html, /class="protocol-cta" href="#planner-title"/);
  assert.match(html, /id="pilot-planner"/);
  assert.match(script, /Try the clipping rehearsal/);
});

test('root homepage loads the same workflow and moving art as the home route', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../public/home.html', import.meta.url), 'utf8');
  const art = readFileSync(new URL('../public/kinetic-art.js', import.meta.url), 'utf8');
  assert.equal(html, home, 'root and home routes should render one identical experience');
  assert.match(html, /href="\/journey\.css"/);
  assert.match(html, /src="\/journey\.js"/);
  assert.match(html, /href="\/kinetic-art\.css"/);
  assert.match(html, /src="\/kinetic-art\.js"/);
  assert.doesNotMatch(html, /#4345ef|#262b97|#7271ff|#a9a7ff|#b6b5ff/i);
  assert.match(css, /body\.home-page #demo \.decision-console[\s\S]*?color: #fffdf8; background: #174535/);
  assert.doesNotMatch(art, /9186c8|120,95,198|180,165,246/i);
});

test('theme uses semantic surface tokens, preserves button roles and honors reduced motion', () => {
  assert.match(css, /--paper:\s*#f6f2e9/);
  assert.match(css, /--surface:\s*#fffdf8/);
  assert.match(css, /--ink:\s*#24251f/);
  assert.match(css, /\.primary[\s\S]*?background:\s*var\(--forest\)/);
  assert.match(css, /\.secondary[\s\S]*?background:\s*transparent/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /body\s*:is\(h1,h2,h3,h4,strong,b,dt,legend\)[^{]*\{[^}]*!important/);
});

test('studio shares the global journey navigation instead of a competing sidebar', () => {
  const html = readFileSync(new URL('../public/studio.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<aside\b/);
  assert.match(html, /src="site-shell\.js"/);
});

test('core journey pages use the same generated navigation shell', () => {
  for (const page of ['index.html','home.html','knowledge.html','studio.html','protocol.html','marketing.html','pilot.html']) {
    const html = readFileSync(new URL(`../public/${page}`, import.meta.url), 'utf8');
    assert.match(html, /site-shell\.css/, `${page} misses shared navigation styles`);
    assert.match(html, /site-shell\.js/, `${page} misses shared navigation`);
    assert.doesNotMatch(html, /<header class="site-header"/, `${page} has a competing bespoke header`);
  }
});
