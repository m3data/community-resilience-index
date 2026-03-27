/**
 * News Volume Signal — Google News RSS
 *
 * No API key required. Counts articles in the last 7 days matching
 * fuel supply keywords. Volume is a proxy for crisis intensity —
 * more coverage = more public attention = likely escalating situation.
 *
 * This is a heuristic, not a precise measure. Google News RSS returns
 * up to ~100 items. The count and recency pattern are what matter.
 */

import type { Signal } from "./types";

const GOOGLE_NEWS_RSS =
  "https://news.google.com/rss/search?q=australia+fuel+supply+diesel&hl=en-AU&gl=AU&ceid=AU:en";

interface NewsItem {
  title: string;
  source: string;
  pubDate: Date;
}

function parseNewsItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (titleMatch && dateMatch) {
      const pubDate = new Date(dateMatch[1].trim());
      if (!isNaN(pubDate.getTime())) {
        items.push({
          title: titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ""),
          source: sourceMatch
            ? sourceMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "")
            : "Unknown",
          pubDate,
        });
      }
    }
  }

  return items;
}

function classifyVolume(
  last24h: number,
  last7d: number
): { label: string; trend: "critical" | "up" | "stable" | "down" } {
  if (last24h >= 10) return { label: "Surge", trend: "critical" };
  if (last24h >= 5) return { label: "Heavy", trend: "up" };
  if (last7d >= 20) return { label: "Elevated", trend: "up" };
  if (last7d >= 10) return { label: "Moderate", trend: "stable" };
  return { label: "Low", trend: "down" };
}

export async function fetchNewsVolume(): Promise<Signal | null> {
  try {
    const res = await fetch(GOOGLE_NEWS_RSS, {
      next: { revalidate: 1800 }, // cache 30min
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const items = parseNewsItems(xml);
    if (items.length === 0) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last24h = items.filter((i) => i.pubDate >= oneDayAgo);
    const last7d = items.filter((i) => i.pubDate >= sevenDaysAgo);

    const { label, trend } = classifyVolume(last24h.length, last7d.length);

    // Most recent headline as context
    const sorted = [...items].sort(
      (a, b) => b.pubDate.getTime() - a.pubDate.getTime()
    );
    const recentHeadline = sorted[0];

    // Top sources
    const sourceCounts = new Map<string, number>();
    for (const item of last7d) {
      sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
    }
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    let context = `${last24h.length} articles in last 24h, ${last7d.length} in last 7 days.`;
    if (recentHeadline) {
      context += ` Latest: "${recentHeadline.title}" (${recentHeadline.source}).`;
    }
    if (topSources.length > 0) {
      context += ` Top sources: ${topSources.join(", ")}.`;
    }

    return {
      label: "News coverage volume",
      value: `${label} (${last7d.length}/7d)`,
      trend,
      source: "Google News AU",
      sourceUrl: "https://news.google.com/search?q=australia%20fuel%20supply%20diesel&hl=en-AU&gl=AU&ceid=AU%3Aen",
      context,
      lastUpdated: recentHeadline
        ? recentHeadline.pubDate.toISOString()
        : new Date().toISOString(),
      automated: true,
      layer: 4,
      layerLabel: "Retail impact",
      propagatesTo: "Public awareness, policy pressure, and demand-side behaviour",
    };
  } catch {
    return null;
  }
}
