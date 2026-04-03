#!/usr/bin/env node
/**
 * Coles price scraper via ar-crawl Playwright service.
 *
 * Workflow (proven by Hugo's PoC):
 *   1. Create session
 *   2. Navigate to coles.com.au homepage (acquires Imperva cookies)
 *   3. Sequential category page navigation within same session
 *   4. JS evaluate extraction per category page
 *   5. Output JSON to stdout or file
 *
 * Prerequisites:
 *   cd /Users/m3untold/Code/ar-crawl/playwright-service && node server.js
 *
 * Usage:
 *   node scrape-coles.mjs                    # stdout
 *   node scrape-coles.mjs -o coles.json      # file
 */

const SERVICE = process.env.ARCRAWL_SERVICE || "http://localhost:3033";

// Coles browse categories — food-relevant subset
const CATEGORIES = [
  { slug: "fruit-vegetables", label: "Fruit & Vegetables" },
  { slug: "dairy-eggs-fridge", label: "Dairy, Eggs & Fridge" },
  { slug: "bakery", label: "Bakery" },
  { slug: "meat-seafood", label: "Meat & Seafood" },
  { slug: "pantry", label: "Pantry" },
  { slug: "frozen", label: "Frozen" },
  { slug: "drinks", label: "Drinks" },
  { slug: "deli", label: "Deli" },
];

async function request(path, options = {}) {
  const url = `${SERVICE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${options.method || "GET"} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function createSession() {
  const data = await request("/session/create", {
    method: "POST",
    body: JSON.stringify({
      viewport: { width: 1920, height: 1080 },
    }),
  });
  return data.sessionId;
}

async function action(sessionId, act) {
  return request(`/session/${sessionId}/action`, {
    method: "POST",
    body: JSON.stringify(act),
  });
}

async function closeSession(sessionId) {
  await fetch(`${SERVICE}/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
}

function parsePrice(priceLabel) {
  if (!priceLabel) return null;
  // "Price $3.50" / "now $3.50" / "$3.50 each" / "$12.00 per kg" etc.
  const match = priceLabel.match(/\$(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseUnit(priceLabel) {
  if (!priceLabel) return "each";
  if (/per\s*kg/i.test(priceLabel)) return "kg";
  if (/per\s*100\s*g/i.test(priceLabel)) return "100g";
  if (/per\s*litre/i.test(priceLabel)) return "litre";
  return "each";
}

// Extract product name and weight from aria-label like "Coles Bananas | approx. 180g"
function parseName(raw) {
  if (!raw) return { name: raw, weight: null };
  const parts = raw.split("|").map((s) => s.trim());
  return {
    name: parts[0] || raw,
    weight: parts[1] || null,
  };
}

async function scrollAndLoad(sessionId) {
  // Scroll in increments to trigger lazy-loading tiles
  for (let i = 0; i < 8; i++) {
    await action(sessionId, {
      type: "evaluate",
      expression: "window.scrollBy(0, window.innerHeight * 2)",
    });
    await action(sessionId, { type: "waitForTimeout", timeout: 1200 });
  }
  // Scroll back to top for clean state
  await action(sessionId, {
    type: "evaluate",
    expression: "window.scrollTo(0, 0)",
  });
  await action(sessionId, { type: "waitForTimeout", timeout: 500 });
}

async function extractProducts(sessionId) {
  // JS evaluate — proven to work against Coles DOM
  const result = await action(sessionId, {
    type: "evaluate",
    expression: `(() => {
      const tiles = document.querySelectorAll('section[data-testid="product-tile"]');
      return Array.from(tiles).map(t => {
        const link = t.querySelector('a[class*="product__link"]');
        const price = t.querySelector('span[data-testid="product-pricing"]');
        return {
          name: link?.getAttribute('aria-label') || link?.textContent?.trim() || null,
          price: price?.getAttribute('aria-label') || price?.textContent?.trim() || null,
        };
      }).filter(p => p.name);
    })()`,
  });
  return result.value || [];
}

async function scrapeCategory(sessionId, category) {
  const url = `https://www.coles.com.au/browse/${category.slug}`;
  process.stderr.write(`  → ${category.label} (${url})\n`);

  await action(sessionId, { type: "goto", url, waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for product tiles to render
  await action(sessionId, {
    type: "waitForSelector",
    selector: 'section[data-testid="product-tile"]',
    timeout: 15000,
  }).catch(() => {
    process.stderr.write(`    ⚠ No product tiles found, skipping\n`);
  });

  // Scroll to load more products via lazy loading
  await scrollAndLoad(sessionId);

  const items = await extractProducts(sessionId);

  return items.map((item) => {
    const { name, weight } = parseName(item.name);
    return {
      name,
      nameRaw: item.name,
      weight,
      price: parsePrice(item.price),
      priceRaw: item.price,
      unit: parseUnit(item.price),
      category: category.label,
      categorySlug: category.slug,
    };
  }).filter((p) => p.name && p.price !== null);
}

async function main() {
  const outFile = process.argv.includes("-o")
    ? process.argv[process.argv.indexOf("-o") + 1]
    : null;

  process.stderr.write(`Coles scraper — connecting to ${SERVICE}\n`);

  // Health check
  try {
    await request("/health");
  } catch {
    process.stderr.write(
      `ERROR: Playwright service not running at ${SERVICE}\n` +
      `Start it: cd /Users/m3untold/Code/ar-crawl/playwright-service && node server.js\n`
    );
    process.exit(1);
  }

  let sessionId;
  try {
    sessionId = await createSession();
    process.stderr.write(`Session: ${sessionId}\n`);

    // Step 1: Navigate to homepage first — acquires Imperva cookies
    process.stderr.write("Acquiring Imperva cookies via homepage...\n");
    await action(sessionId, {
      type: "goto",
      url: "https://www.coles.com.au",
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    // Wait for Imperva challenge to resolve and cookies to settle
    await action(sessionId, { type: "waitForTimeout", timeout: 5000 });

    // Step 2: Crawl each category sequentially
    const allProducts = [];
    for (const cat of CATEGORIES) {
      try {
        const products = await scrapeCategory(sessionId, cat);
        allProducts.push(...products);
        process.stderr.write(`    ✓ ${products.length} products\n`);
      } catch (err) {
        process.stderr.write(`    ✗ ${cat.label}: ${err.message}\n`);
      }
      // Rate limit between categories
      await action(sessionId, { type: "waitForTimeout", timeout: 2000 });
    }

    const result = {
      meta: {
        source: "Coles Online",
        scraped: new Date().toISOString(),
        categories: CATEGORIES.length,
        totalProducts: allProducts.length,
        url: "https://www.coles.com.au",
      },
      products: allProducts,
    };

    const json = JSON.stringify(result, null, 2);
    if (outFile) {
      const { writeFileSync } = await import("fs");
      writeFileSync(outFile, json);
      process.stderr.write(`\nWrote ${allProducts.length} products to ${outFile}\n`);
    } else {
      process.stdout.write(json);
    }

    process.stderr.write(`\nDone: ${allProducts.length} products across ${CATEGORIES.length} categories\n`);
  } finally {
    if (sessionId) await closeSession(sessionId);
  }
}

main().catch((err) => {
  process.stderr.write(`FATAL: ${err.message}\n`);
  process.exit(1);
});
