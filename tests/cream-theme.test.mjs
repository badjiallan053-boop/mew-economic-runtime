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
    assert.match(html, /href="\/cream-motion\.css\?v=cream-20261008c"/, `${page} misses shared theme`);
    assert.match(html, /name="theme-color" content="#f6f2e9"/, `${page} has mismatched browser chrome`);
  }
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
