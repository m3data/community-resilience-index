#!/usr/bin/env node
/**
 * Energy policy news scraper — daily automated intelligence.
 *
 * Fetches from:
 *   1. Google News RSS with targeted AU energy/fuel policy queries
 *   2. IEA news RSS
 *   3. energy.gov.au media releases (HTML scrape)
 *   4. DCCEEW/Energy Minister media pages (HTML scrape)
 *
 * No Playwright needed — all plain HTTP.
 *
 * Usage:
 *   node scrape-energy-news.mjs                    # stdout
 *   node scrape-energy-news.mjs -o energy-news.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DEFAULT = resolve(__dirname, "../app/src/data/energy-news.json");

// --- Google News RSS queries ---
// Each query targets a specific facet of the fuel/energy policy landscape.
// Google News RSS returns ~20 results per query with title, link, date, source.

const GOOGLE_NEWS_QUERIES = [
  {
    id: "fuel-security",
    label: "Fuel security & reserves",
    query: '"fuel security" OR "petroleum reserves" OR "fuel stocks" OR "IEA obligation" Australia',
  },
  {
    id: "fuel-deals",
    label: "International fuel agreements",
    query: 'Australia (Japan OR Korea OR India OR Singapore OR "Middle East") (fuel OR petroleum OR oil OR LNG) (deal OR agreement OR supply OR contract)',
  },
  {
    id: "energy-policy",
    label: "Energy policy & regulation",
    query: 'Australia ("energy minister" OR DCCEEW OR ACCC OR "energy policy") (fuel OR diesel OR petrol OR electricity)',
  },
  {
    id: "diesel-crisis",
    label: "Fuel supply disruption",
    query: 'Australia (diesel OR fuel OR petrol) (shortage OR crisis OR supply OR rationing OR "price gouging")',
  },
  {
    id: "refinery-supply",
    label: "Refinery & supply chain",
    query: 'Australia (Ampol OR "Viva Energy" OR Lytton OR Geelong) (refinery OR refining OR shutdown OR maintenance)',
  },
  {
    id: "food-supply",
    label: "Food supply chain pressure",
    query: 'Australia (food OR grocery OR supermarket) (price OR shortage OR supply chain OR freight) -recipe -review',
  },
];

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

// --- IEA RSS ---
const IEA_RSS = "https://www.iea.org/news/rss";

// --- Source authority ---
//
// Three tiers:
//   authoritative — government sources, wire services, international bodies, public broadcasters
//   established   — major mastheads with editorial standards (may carry bias, but citable)
//   low-authority — aggregators, social media, tabloid/opinion-first outlets
//   excluded      — sources we never surface (social media platforms, content farms)
//
// Murdoch/News Corp outlets (Sky News AU, The Australian, Herald Sun, Daily Telegraph,
// news.com.au, Courier-Mail, The Advertiser) are flagged as right-leaning editorial bias.
// They are not excluded — they break real stories — but their authority score is reduced
// and a bias flag is attached so the signal module can note it.

const EXCLUDED_SOURCES = [
  "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
  "tiktok.com", "reddit.com", "youtube.com", "threads.net",
  "linkedin.com",
];

// Normalise source string for matching
function normSource(source) {
  if (!source) return "";
  return source.toLowerCase().replace(/^www\./, "").trim();
}

function isExcluded(article) {
  const src = normSource(article.source);
  const url = (article.url || "").toLowerCase();
  return EXCLUDED_SOURCES.some((ex) => src.includes(ex) || url.includes(ex));
}

const AUTHORITATIVE_SOURCES = [
  // Government / institutional
  "energy.gov.au", "dcceew.gov.au", "pm.gov.au", "treasurer.gov.au",
  "accc.gov.au", "aemo.com.au", "rba.gov.au", "abs.gov.au",
  "iea.org", "opec.org",
  // Wire services
  "reuters", "associated press", "ap news", "afp", "bloomberg",
  "australian associated press", "aap",
  // Public broadcasters
  "abc news", "abc.net.au", "sbs news", "sbs.com.au",
  "bbc", "al jazeera",
  // Industry authority
  "aip.com.au", "appea", "bitre.gov.au",
];

const ESTABLISHED_SOURCES = [
  // Quality Australian mastheads
  "the guardian", "guardian australia", "the conversation",
  "crikey", "the saturday paper", "australian financial review", "afr.com",
  "nine news", "9news", "seven news", "7news",
  "canberra times", "region",
  // International quality
  "the economist", "financial times", "nikkei", "south china morning post",
  "the new york times", "washington post",
  // Trade / specialist
  "tradingview", "rigzone", "upstream", "argus media", "platts",
  "retail insight", "the motley fool",
];

const MURDOCH_NEWS_CORP = [
  "sky news australia", "sky news", "skynews",
  "the australian", "theaustralian",
  "news.com.au",
  "daily telegraph", "dailytelegraph",
  "herald sun", "heraldsun",
  "courier-mail", "couriermail",
  "the advertiser",
  "the mercury",
  "foxnews", "fox news",
];

function scoreAuthority(article) {
  const src = normSource(article.source);
  const url = (article.url || "").toLowerCase();
  const match = (list) => list.some((s) => src.includes(s) || url.includes(s));

  // Check Murdoch/News Corp FIRST — "The Australian" would otherwise match
  // authoritative sources due to the word "Australian" in other source names.
  if (match(MURDOCH_NEWS_CORP)) return { score: 1, tier: "established", bias: "news-corp-right-leaning" };
  if (match(AUTHORITATIVE_SOURCES)) return { score: 3, tier: "authoritative", bias: null };
  if (match(ESTABLISHED_SOURCES)) return { score: 2, tier: "established", bias: null };
  return { score: 0, tier: "unrated", bias: null };
}

// --- Direct quote detection ---
// Articles containing direct quotes from key decision-makers get a boost

const KEY_SPEAKERS = [
  "prime minister", "albanese",
  "energy minister", "chris bowen", "bowen",
  "treasurer", "chalmers",
  "accc chair", "gina cass-gottlieb",
  "opposition leader", "dutton",
  "iea", "fatih birol",
];

function hasDirectQuote(article) {
  const text = ((article.title || "") + " " + (article.summary || "")).toLowerCase();
  const hasQuoteMark = text.includes('"') || text.includes("'") || text.includes("\u2018") || text.includes("\u201c");
  const hasSpeaker = KEY_SPEAKERS.some((s) => text.includes(s));
  return hasQuoteMark && hasSpeaker;
}

// --- Keyword relevance scoring ---
const HIGH_RELEVANCE = [
  "fuel security", "petroleum reserves", "fuel stocks", "IEA",
  "strategic reserve", "MSO", "minimum stockholding",
  "fuel deal", "fuel agreement", "supply agreement",
  "diesel shortage", "fuel crisis", "rationing",
  "refinery", "terminal gate", "wholesale",
  "DCCEEW", "energy minister", "ACCC",
  "strait of hormuz", "shipping disruption",
  "Japan fuel", "Korea fuel", "Singapore fuel",
  "LNG export", "fuel import",
];

const MEDIUM_RELEVANCE = [
  "fuel price", "diesel price", "petrol price",
  "electricity price", "energy price",
  "food price", "grocery price",
  "freight cost", "transport cost",
  "Ampol", "Viva Energy", "BP Australia",
  "supply chain", "cascade",
];

function scoreRelevance(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of HIGH_RELEVANCE) {
    if (lower.includes(kw.toLowerCase())) score += 3;
  }
  for (const kw of MEDIUM_RELEVANCE) {
    if (lower.includes(kw.toLowerCase())) score += 1;
  }
  return score;
}

// --- RSS parsing (simple XML extraction, no deps) ---

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");
    const source = extractTag(block, "source");

    if (title && link) {
      items.push({
        title: decodeEntities(title),
        url: link,
        published: pubDate ? new Date(pubDate).toISOString() : null,
        source: source ? decodeEntities(source) : null,
        summary: description ? decodeEntities(stripHtml(description)).slice(0, 300) : null,
      });
    }
  }
  return items;
}

function extractTag(xml, tag) {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// --- Fetch helpers ---

async function fetchRss(url, timeout = 10000) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: {
        "User-Agent": "CRI-Signal-Intelligence/1.0 (community resilience research)",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml);
  } catch {
    return [];
  }
}

async function fetchGoogleNews(queryDef) {
  const params = new URLSearchParams({
    q: queryDef.query,
    hl: "en-AU",
    gl: "AU",
    ceid: "AU:en",
  });
  const items = await fetchRss(`${GOOGLE_NEWS_RSS}?${params}`);
  return items.map((item) => ({
    ...item,
    queryId: queryDef.id,
    queryLabel: queryDef.label,
  }));
}

// --- Deduplication ---

function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    // Dedupe by normalised title (remove source suffix Google News adds)
    const key = a.title
      .toLowerCase()
      .replace(/\s*-\s*[^-]+$/, "") // strip " - Source Name" suffix
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Age filtering ---

function filterRecent(articles, days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return articles.filter((a) => {
    if (!a.published) return true; // keep if no date
    return new Date(a.published).getTime() > cutoff;
  });
}

// --- Main ---

async function main() {
  const outFile = process.argv.includes("-o")
    ? process.argv[process.argv.indexOf("-o") + 1]
    : OUTPUT_DEFAULT;

  process.stderr.write("Energy news scraper starting...\n");

  // Fetch all sources in parallel
  const fetches = [
    ...GOOGLE_NEWS_QUERIES.map((q) => fetchGoogleNews(q)),
    fetchRss(IEA_RSS).then((items) =>
      items
        .filter((i) => /australia|asia|pacific|oil|fuel|IEA/i.test(i.title + " " + (i.summary || "")))
        .map((i) => ({ ...i, queryId: "iea", queryLabel: "IEA News" }))
    ),
  ];

  const results = await Promise.all(fetches);
  let allArticles = results.flat();

  process.stderr.write(`  Raw articles: ${allArticles.length}\n`);

  // Exclude social media and content farms
  const excluded = allArticles.filter(isExcluded);
  allArticles = allArticles.filter((a) => !isExcluded(a));
  if (excluded.length > 0) {
    process.stderr.write(`  Excluded (social media/content farms): ${excluded.length}\n`);
  }

  // Filter to last 7 days
  allArticles = filterRecent(allArticles, 7);
  process.stderr.write(`  Last 7 days: ${allArticles.length}\n`);

  // Deduplicate
  allArticles = deduplicateArticles(allArticles);
  process.stderr.write(`  After dedup: ${allArticles.length}\n`);

  // Score: relevance (keyword) + authority (source) + direct quote boost
  allArticles = allArticles.map((a) => {
    const relevance = scoreRelevance(a.title + " " + (a.summary || ""));
    const authority = scoreAuthority(a);
    const directQuote = hasDirectQuote(a);

    // Combined score: keyword relevance + authority + quote boost
    // Authority weighs heavily — an authoritative source with medium keywords
    // ranks higher than a low-authority source with high keywords
    const combinedScore = relevance + (authority.score * 2) + (directQuote ? 3 : 0);

    return {
      ...a,
      relevance,
      authority: authority.tier,
      authorityScore: authority.score,
      bias: authority.bias,
      directQuote,
      combinedScore,
    };
  });

  // Sort by combined score then date
  allArticles.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    return new Date(b.published || 0).getTime() - new Date(a.published || 0).getTime();
  });

  // Categorise
  const highRelevance = allArticles.filter((a) => a.combinedScore >= 5);
  const mediumRelevance = allArticles.filter((a) => a.combinedScore >= 2 && a.combinedScore < 5);
  const backgroundNoise = allArticles.filter((a) => a.combinedScore < 2);

  // Authority breakdown
  const authCounts = { authoritative: 0, established: 0, unrated: 0, biased: 0 };
  for (const a of allArticles) {
    authCounts[a.authority] = (authCounts[a.authority] || 0) + 1;
    if (a.bias) authCounts.biased++;
  }

  process.stderr.write(`  High combined score: ${highRelevance.length}\n`);
  process.stderr.write(`  Medium: ${mediumRelevance.length}\n`);
  process.stderr.write(`  Background: ${backgroundNoise.length}\n`);
  process.stderr.write(`  Authority: ${authCounts.authoritative} authoritative, ${authCounts.established} established, ${authCounts.unrated} unrated\n`);
  if (authCounts.biased > 0) {
    process.stderr.write(`  Flagged bias: ${authCounts.biased} (News Corp)\n`);
  }

  // Load previous data to detect new articles
  let previousUrls = new Set();
  try {
    if (existsSync(outFile)) {
      const prev = JSON.parse(readFileSync(outFile, "utf8"));
      previousUrls = new Set((prev.articles || []).map((a) => a.url));
    }
  } catch { /* first run */ }

  const newArticles = allArticles.filter((a) => !previousUrls.has(a.url));

  // Build output
  const result = {
    meta: {
      scraped: new Date().toISOString(),
      sources: GOOGLE_NEWS_QUERIES.length + 1, // +1 for IEA
      totalArticles: allArticles.length,
      highRelevance: highRelevance.length,
      newSinceLastRun: newArticles.length,
      queries: GOOGLE_NEWS_QUERIES.map((q) => q.id),
      authority: authCounts,
    },
    // Top articles — high combined score, max 30
    articles: highRelevance.concat(mediumRelevance).slice(0, 30).map((a) => ({
      title: a.title,
      url: a.url,
      published: a.published,
      source: a.source,
      summary: a.summary,
      relevance: a.relevance,
      authority: a.authority,
      bias: a.bias,
      directQuote: a.directQuote || undefined,
      combinedScore: a.combinedScore,
      queryId: a.queryId,
      queryLabel: a.queryLabel,
    })),
    // Policy-critical: high combined score from authoritative/established sources only
    // Excludes biased sources from the critical list unless they contain direct quotes
    critical: highRelevance
      .filter((a) => a.combinedScore >= 7 && (a.authority !== "unrated"))
      .filter((a) => !a.bias || a.directQuote)
      .slice(0, 5)
      .map((a) => ({
        title: a.title,
        url: a.url,
        published: a.published,
        source: a.source,
        authority: a.authority,
        bias: a.bias,
        directQuote: a.directQuote || undefined,
      })),
  };

  writeFileSync(resolve(outFile), JSON.stringify(result, null, 2));

  process.stderr.write(`\nWrote ${result.articles.length} articles to ${outFile}\n`);
  if (newArticles.length > 0) {
    process.stderr.write(`  ${newArticles.length} new since last run\n`);
  }
  process.stderr.write("Done.\n");
}

main().catch((err) => {
  process.stderr.write(`FATAL: ${err.message}\n`);
  process.exit(1);
});
