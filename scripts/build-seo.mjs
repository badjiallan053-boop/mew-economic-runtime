import { readFile, writeFile } from "node:fs/promises";

export const origin = "https://mew-demo-production.up.railway.app";
export const indexedPages = {
  "marketing.html": ["MEW — Marketing, advertising and clipping", "See how one recording becomes five reviewed clips and a campaign. Explore Web2 and Web3 pilot examples, separate budgets and the integration roadmap."],
  "insurance.html": ["MEW — Evidence for agentic insurance workflows", "See how bounded agent actions and verified evidence could support insurance review, while policy terms and claims remain with authorized insurers."],
  "protocol.html": [
    "MEW — Why the second order waits",
    "Understand why an unanswered supplier request stays open. Follow a simple visual example, inspect the demo record and plan one reviewable pilot.",
  ],
  "pilot.html": [
    "MEW — Plan a bounded purchasing-agent pilot",
    "Define one deliverable, an acceptance owner and a retry policy. Prepare a local pilot brief without submitting personal information.",
  ],
  "company.html": [
    "MEW — Advisory agent workflows",
    "Inspect MEW’s assigned advisory roles, evidence handoffs and independent risk review. Live model execution and payments remain disabled.",
  ],
  "research.html": [
    "MEW — Public ecosystem evidence",
    "Inspect dated public observations and publisher context. Research informs advisory planning and does not authorize agent payments.",
  ],
  "knowledge.html": [
    "MEW — Engineering knowledge and public data",
    "Explore reviewed Stanford course references, open API observations and the evidence-to-decision workflow. No automatic training or payment activation.",
  ],
};
export const workspacePages = [
  "studio.html",
  "campaign.html",
  "rehearsal.html",
  "design-studio.html",
  "presentation.html",
];
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
export async function buildSeo(root = "public") {
  for (const [file, [title, description]] of Object.entries(indexedPages)) {
    let html = await readFile(`${root}/${file}`, "utf8");
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
    const url = `${origin}/${file}`;
    const block = `<!-- MEW SEO START -->\n<meta name="description" content="${escape(description)}"><link rel="canonical" href="${url}"><meta name="robots" content="index,follow"><meta property="og:type" content="website"><meta property="og:site_name" content="MEW"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/assets/mew-social.png"><meta property="og:image:alt" content="MEW — one purchase, one shared mandate. Interactive prototype; models and payments disabled."><meta name="twitter:card" content="summary_large_image">\n<!-- MEW SEO END -->`;
    const markers = /<!-- MEW SEO START -->[\s\S]*?<!-- MEW SEO END -->/;
    const existingBlock = html.match(markers)?.[0];
    if (existingBlock) {
      if (!existingBlock.includes(url) || !existingBlock.includes(escape(description))) {
        html = html.replace(markers, block);
      }
    } else {
      html = html
        .replace(/<meta\b[^>]*>/gi, (tag) =>
          /\b(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["']/i.test(tag)
            ? ""
            : tag,
        )
        .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, "")
        .replace("</head>", `${block}\n</head>`);
    }
    await writeFile(`${root}/${file}`, html);
  }
  for (const file of workspacePages) {
    let html = await readFile(`${root}/${file}`, "utf8");
    const markers = /<!-- MEW SEO START -->[\s\S]*?<!-- MEW SEO END -->/;
    const noindex = '<!-- MEW SEO START --><meta name="robots" content="noindex,follow"><!-- MEW SEO END -->';
    const existingBlock = html.match(markers)?.[0];
    if (existingBlock) {
      if (!existingBlock.includes('name="robots" content="noindex,follow"')) html = html.replace(markers, noindex);
    } else {
      html = html.replace("</head>", `${noindex}</head>`);
    }
    await writeFile(`${root}/${file}`, html);
  }
  const paths = ["/", ...Object.keys(indexedPages).map((file) => `/${file}`)];
  await writeFile(
    `${root}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>\n`,
  );
  // Permit workspace crawling so crawlers can observe the noindex metadata.
  await writeFile(
    `${root}/robots.txt`,
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
  );
}
if (process.argv[1]?.endsWith("/build-seo.mjs")) await buildSeo();
