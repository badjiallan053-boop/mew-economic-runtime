import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { educationMission } from "../src/company/education-context.mjs";
const directory = process.argv[2];
if (!directory) throw new Error("Pass a reviewed education snapshot directory");
const text = await readFile(resolve(directory, "records.jsonl"), "utf8");
const quality = JSON.parse(
  await readFile(resolve(directory, "quality.json"), "utf8"),
);
educationMission(text, quality); // Reject damaged, stale or authority-expanded publication inputs.
const records = text
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const card = (r) =>
  `<article class="knowledge-card"><p class="eyebrow">${escape(r.grain.replaceAll("_", " "))} · ${escape(r.reviewStatus)}</p><h3>${escape(r.title)}</h3><p>${escape(r.summary)}</p><p class="source-detail">Captured ${escape(r.observedAt)}. ${r.grain === "network_tip" ? "Historical preprod indexer observation; not current chain state or payment proof." : r.grain === "work_metadata" ? "Discovery metadata; relevance and paper findings remain unreviewed." : "MEW-owned research note; no course endorsement or demonstrated model competence."}</p><a class="text-link" href="${escape(r.referenceUrl)}" rel="noreferrer">Inspect the source ↗</a></article>`;
const groups = [
  [
    "Courses and engineering references",
    records.filter((r) =>
      ["course_reference", "repository_reference"].includes(r.grain),
    ),
  ],
  ["Paper discovery", records.filter((r) => r.grain === "work_metadata")],
  ["Blockchain context", records.filter((r) => r.grain === "network_tip")],
];
await writeFile(
  "public/education-snapshot.json",
  JSON.stringify(
    {
      schema: "mew.public-education.v1",
      asOf: quality.asOf,
      recordCount: records.length,
      recordsSha256: quality.recordsSha256,
      trainingAuthorized: false,
      modelActivationAllowed: false,
      paymentsEnabled: false,
      records,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  "public/knowledge.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEW — Engineering knowledge</title><link rel="stylesheet" href="/assets/fonts/instrument.css"><link rel="stylesheet" href="/home.css"><link rel="stylesheet" href="/knowledge.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/">mew.</a><nav aria-label="Main navigation"><a href="/">The idea</a><a href="/protocol.html#evidence">The proof</a><a href="/pilot.html">Pilot with us</a></nav><a class="header-cta" href="/home.html#demo">Run the demo ↗</a></header><main id="main" class="knowledge-main"><p class="eyebrow">ENGINEERING KNOWLEDGE / DATED PUBLIC SOURCES</p><h1>Better context.<br><em>Bounded decisions.</em></h1><p class="lead">Public courses and open APIs help us design experiments. Evidence passes through a reviewable advisory workflow; it never becomes spending authority.</p><div class="knowledge-boundary"><strong>${records.length} archived observations · ${quality.succeeded}/${quality.succeeded + quality.unavailable} sources retrieved</strong><p>Captured ${escape(quality.asOf)}. Snapshot completeness measures retrieval success, not representative coverage, research validity or answer quality. Models and payments remain disabled. No automatic training.</p></div><section aria-labelledby="workflow-title"><p class="eyebrow">THE EXISTING TEAM / FIVE ROLES, SIX TASKS</p><h2 id="workflow-title">From source to a reviewable proposal.</h2><ol class="knowledge-steps"><li><strong>Coordinator</strong> scopes an immutable mission and permitted evidence.</li><li><strong>Knowledge</strong> identifies exact support, dates and reuse constraints.</li><li><strong>Engineering</strong> proposes a bounded, reproducible experiment.</li><li><strong>Risk and red team</strong> review independently: freshness, injection, provenance and authority.</li><li><strong>Coordinator</strong> synthesizes the accepted handoffs. Contract execution is rehearsed with a simulated provider; it is not model judgment.</li></ol><p>Integrity hashes detect changed bytes, not publisher truth. Source-specific freshness excludes old network tips from new advisory missions; the archive below remains historical.</p></section>${groups.map(([label, items]) => `<section><h2>${label}</h2><div class="knowledge-grid">${items.map(card).join("")}</div></section>`).join("")}<section class="knowledge-next"><h2>Turn context into one test.</h2><p>Keep the existing benchmark frozen. Review source relevance and training rights, label a separate holdout, measure base-model errors, then consider fine-tuning against demonstrated failures.</p><a class="button primary" href="/pilot.html">Plan a bounded pilot ↗</a><a class="text-link" href="/education-snapshot.json">Inspect the dated metadata →</a></section></main><footer class="site-footer"><p>Public research context. No wallet connection, live inference or payment execution.</p><a class="text-link" href="/">Return to MEW →</a></footer></body></html>\n`,
);
console.log(
  `Published ${records.length} historical observations; no live authority enabled.`,
);
