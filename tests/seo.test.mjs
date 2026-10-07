import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSeo,
  indexedPages,
  workspacePages,
  origin,
} from "../scripts/build-seo.mjs";

test("SEO generation replaces conflicting snippets, excludes workspaces and remains repeatable", async () => {
  const root = await mkdtemp(join(tmpdir(), "mew-seo-"));
  try {
    const files = [...Object.keys(indexedPages), ...workspacePages];
    for (const file of files)
      await writeFile(
        join(root, file),
        '<html><head><title>Old</title><meta name="description" content="Conflicting old claim"></head><body><h1>Essential product text</h1></body></html>',
      );
    await buildSeo(root);
    const before = await readFile(join(root, "protocol.html"), "utf8");
    await buildSeo(root);
    assert.equal(await readFile(join(root, "protocol.html"), "utf8"), before);
    assert.equal((before.match(/name="description"/g) || []).length, 1);
    assert.equal((before.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(before.includes(`${origin}/protocol.html`));
    assert.ok(before.includes("Essential product text"));
    const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
    for (const file of workspacePages) {
      assert.ok(!sitemap.includes(file));
      assert.match(await readFile(join(root, file), "utf8"), /noindex,follow/);
    }
    const robots = await readFile(join(root, "robots.txt"), "utf8");
    assert.match(robots, /Disallow: \/api\//);
    assert.doesNotMatch(robots, /Disallow: \/studio.html/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
