import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNewsVolume } from "../news-volume";

function makeItem(title: string, source: string, pubDate: Date): string {
  return `<item>
    <title>${title}</title>
    <source url="https://example.com">${source}</source>
    <pubDate>${pubDate.toUTCString()}</pubDate>
  </item>`;
}

function wrapRss(items: string[]): string {
  return `<?xml version="1.0"?><rss><channel>${items.join("")}</channel></rss>`;
}

function mockFetchOk(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchNewsVolume", () => {
  it("returns a valid Signal with correct volume classification", async () => {
    const now = new Date();
    const items = Array.from({ length: 12 }, (_, i) =>
      makeItem(
        `Fuel crisis article ${i}`,
        i % 2 === 0 ? "ABC News" : "The Guardian",
        new Date(now.getTime() - i * 60 * 60 * 1000) // one per hour going back
      )
    );
    vi.stubGlobal("fetch", mockFetchOk(wrapRss(items)));

    const signal = await fetchNewsVolume();

    expect(signal).not.toBeNull();
    expect(signal!.label).toBe("News coverage volume");
    expect(signal!.trend).toBe("critical"); // 12 in last 24h >= 10
    expect(signal!.value).toContain("Surge");
    expect(signal!.source).toBe("Google News AU");
    expect(signal!.automated).toBe(true);
    expect(signal!.context).toContain("12 articles in last 24h");
    expect(signal!.context).toContain("ABC News");
  });

  it("classifies low volume correctly", async () => {
    const now = new Date();
    // 3 items, all > 24h ago but within 7 days
    const items = Array.from({ length: 3 }, (_, i) =>
      makeItem(
        `Article ${i}`,
        "SMH",
        new Date(now.getTime() - (2 + i) * 24 * 60 * 60 * 1000)
      )
    );
    vi.stubGlobal("fetch", mockFetchOk(wrapRss(items)));

    const signal = await fetchNewsVolume();

    expect(signal).not.toBeNull();
    expect(signal!.trend).toBe("down"); // last7d=3 < 10
    expect(signal!.value).toContain("Low");
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    const signal = await fetchNewsVolume();
    expect(signal).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    );

    const signal = await fetchNewsVolume();
    expect(signal).toBeNull();
  });

  it("returns null when RSS has no valid items", async () => {
    const noItems = `<rss><channel><title>Empty</title></channel></rss>`;
    vi.stubGlobal("fetch", mockFetchOk(noItems));

    const signal = await fetchNewsVolume();
    expect(signal).toBeNull();
  });
});
