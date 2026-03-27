/**
 * Energy policy news signal — Layer 2: Supply position context
 *
 * Reads scraped news data from energy-news.json.
 * Surfaces recent government decisions, international agreements,
 * and supply chain developments that affect the fuel security picture.
 *
 * Data flow:
 *   scrape-energy-news.mjs → energy-news.json → this module
 *
 * Updated daily via refresh-signals.sh (launchd).
 * No live fetching at request time — reads cached data.
 */

import type { Signal, SignalComponent } from "./types";
import { readFileSync } from "fs";
import { join } from "path";

interface NewsArticle {
  title: string;
  url: string;
  published: string | null;
  source: string | null;
  summary: string | null;
  relevance: number;
  queryId: string;
  queryLabel: string;
}

interface CriticalArticle {
  title: string;
  url: string;
  published: string | null;
  source: string | null;
}

interface EnergyNews {
  meta: {
    scraped: string;
    totalArticles: number;
    highRelevance: number;
    newSinceLastRun: number;
  };
  articles: NewsArticle[];
  critical: CriticalArticle[];
}

function loadNews(): EnergyNews | null {
  try {
    const filePath = join(process.cwd(), "src/data/energy-news.json");
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = daysSince(dateStr);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function fetchEnergyPolicyNews(): Signal | null {
  const data = loadNews();
  if (!data || data.articles.length === 0) return null;

  const age = daysSince(data.meta.scraped);
  if (age > 3) {
    // Data more than 3 days old — flag but still show
  }

  // Build components from top articles by query category
  const byCategory = new Map<string, NewsArticle[]>();
  for (const article of data.articles) {
    const existing = byCategory.get(article.queryLabel) || [];
    existing.push(article);
    byCategory.set(article.queryLabel, existing);
  }

  const components: SignalComponent[] = [];
  for (const [label, articles] of byCategory) {
    const topArticle = articles[0];
    const recentCount = articles.filter(
      (a) => a.published && daysSince(a.published) <= 2
    ).length;

    components.push({
      label,
      value: `${articles.length} articles`,
      change: recentCount > 0 ? `${recentCount} in last 48h` : undefined,
      trend: recentCount >= 3 ? "up" : "stable",
    });
  }

  // Determine trend from critical articles and recency
  const recentCritical = data.critical.filter(
    (a) => a.published && daysSince(a.published) <= 2
  );
  const totalRecent = data.articles.filter(
    (a) => a.published && daysSince(a.published) <= 1
  ).length;

  let trend: Signal["trend"] = "stable";
  if (recentCritical.length >= 2) trend = "critical";
  else if (recentCritical.length >= 1 || totalRecent >= 5) trend = "up";

  // Build headline from most critical/recent article
  const headlineArticle = data.critical[0] || data.articles[0];
  const headlineDate = formatRelativeDate(headlineArticle.published);
  const value = headlineArticle
    ? `${data.meta.highRelevance} high-relevance articles`
    : "No recent policy developments";

  // Context narrative
  let context = "";

  if (data.critical.length > 0) {
    context += "Recent policy-critical developments: ";
    context += data.critical
      .slice(0, 3)
      .map(
        (a) =>
          `"${a.title}"${a.source ? ` (${a.source})` : ""}${a.published ? `, ${formatRelativeDate(a.published)}` : ""}`
      )
      .join(". ");
    context += ". ";
  }

  context += `${data.articles.length} articles tracked across ${byCategory.size} categories in the last 7 days. `;

  if (data.meta.newSinceLastRun > 0) {
    context += `${data.meta.newSinceLastRun} new since the previous scan. `;
  }

  if (age > 2) {
    context += `Note: news data is ${age} days old — re-run the scraper for current coverage. `;
  }

  context +=
    "This signal tracks government fuel policy decisions, international supply agreements, ACCC enforcement, " +
    "and supply chain disruptions from public news sources. It does not assess the quality or accuracy of reporting — " +
    "it surfaces what is being reported so citizens can follow developments as they unfold.";

  return {
    label: "Energy policy intelligence",
    value,
    trend,
    source: "Google News, IEA",
    context,
    lastUpdated: data.meta.scraped,
    automated: false, // requires scheduled scraper
    layer: 2,
    layerLabel: "Supply position",
    propagatesTo:
      "Government fuel policy decisions directly affect supply security, pricing, and crisis response capacity",
    components,
    secondary: headlineArticle
      ? {
          label: "Latest critical development",
          value: headlineArticle.title,
          detail: headlineArticle.source
            ? `${headlineArticle.source} — ${formatRelativeDate(headlineArticle.published)}`
            : formatRelativeDate(headlineArticle.published),
        }
      : undefined,
  };
}
