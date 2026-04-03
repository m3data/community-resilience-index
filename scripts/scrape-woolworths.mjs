#!/usr/bin/env node
/**
 * Woolworths price scraper via ar-crawl Playwright service.
 *
 * Same session-mode pattern as Coles:
 *   1. Homepage first (bot protection cookies)
 *   2. Sequential category navigation
 *   3. Shadow DOM extraction from wc-product-tile web components
 *
 * Woolworths uses Angular + shadow DOM web components. Product data
 * is in aria-label attributes inside shadow roots:
 *   "[badges]. [Name] [size], $[price], $[unit_price] / [unit]."
 *
 * Prerequisites:
 *   cd /Users/m3untold/Code/ar-crawl/playwright-service && node server.js
 *
 * Usage:
 *   node scrape-woolworths.mjs                    # stdout
 *   node scrape-woolworths.mjs -o woolworths.json # file
 */

const SERVICE = process.env.ARCRAWL_SERVICE || "http://localhost:3033";

// Woolworths browse categories — food-relevant subset
const CATEGORIES = [
  { slug: "fruit-veg", label: "Fruit & Veg" },
  { slug: "poultry-meat-seafood", label: "Meat & Seafood" },
  { slug: "bakery", label: "Bakery" },
  { slug: "dairy-eggs-fridge", label: "Dairy, Eggs & Fridge" },
  { slug: "pantry", label: "Pantry" },
  { slug: "frozen", label: "Frozen" },
  { slug: "drinks", label: "Drinks" },
  { slug: "deli-entertaining", label: "Deli" },
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

// Parse Woolworths aria-label format:
// "[badges]. [Name] [size], $[price], $[unit_price] / [unit]."
// "Australian Grown. Woolworths Washed Potatoes Bag 2kg, $8, $4.00 per 1KG."
// "Out of stock. Avocado Shepard each."
function parseAriaLabel(label) {
  if (!label) return null;

  // Skip out-of-stock items
  if (/out of stock/i.test(label)) return null;

  // Remove leading badge/promo text — these are short phrases ending with ". "
  // e.g. "Australian Grown. ", "Fresh Special. ", "Special. On special. Save $2.00 . "
  // Keep stripping until we hit something that looks like a product name (starts with a capital letter
  // followed by lowercase, or a brand name)
  let cleaned = label;
  cleaned = cleaned.replace(
    /^(?:Australian Grown|Australian Lamb|Fresh Special|Special|New|Low Price|Price Dropped|Everyday|Half Price|Better Than Half Price|ONLY AT WOOLWORTHS|On special|Save \$[\d.]+|Was \$[\d.]+)\s*\.?\s*/gi,
    ""
  );
  // Second pass for chained badges
  cleaned = cleaned.replace(
    /^(?:Australian Grown|Australian Lamb|Fresh Special|Special|New|Low Price|Price Dropped|Everyday|Half Price|Better Than Half Price|ONLY AT WOOLWORTHS|On special|Save \$[\d.]+|Was \$[\d.]+)\s*\.?\s*/gi,
    ""
  );
  // Third pass (some have 3+ badges)
  cleaned = cleaned.replace(
    /^(?:Australian Grown|Australian Lamb|Fresh Special|Special|New|Low Price|Price Dropped|Everyday|Half Price|Better Than Half Price|ONLY AT WOOLWORTHS|On special|Save \$[\d.]+|Was \$[\d.]+)\s*\.?\s*/gi,
    ""
  );

  // Try structured format: "Name size, $price, $unit_price / unit."
  const structured = cleaned.match(
    /^(.+?)\s*,\s*\$(\d+(?:\.\d+)?)\s*,\s*\$([\d.]+)\s*(?:per|\/)\s*(.+?)\.?\s*$/i
  );

  if (structured) {
    return {
      name: structured[1].trim(),
      price: parseFloat(structured[2]),
      unitPrice: parseFloat(structured[3]),
      unit: structured[4].trim(),
    };
  }

  // Fallback: just find price
  const priceMatch = cleaned.match(/^(.+?)\s*,\s*\$(\d+(?:\.\d+)?)/);
  if (priceMatch) {
    return {
      name: priceMatch[1].trim(),
      price: parseFloat(priceMatch[2]),
      unitPrice: null,
      unit: "each",
    };
  }

  return null;
}

async function scrollAndLoad(sessionId) {
  for (let i = 0; i < 8; i++) {
    await action(sessionId, {
      type: "evaluate",
      expression: "window.scrollBy(0, window.innerHeight * 2)",
    });
    await action(sessionId, { type: "waitForTimeout", timeout: 1200 });
  }
  await action(sessionId, {
    type: "evaluate",
    expression: "window.scrollTo(0, 0)",
  });
  await action(sessionId, { type: "waitForTimeout", timeout: 500 });
}

async function extractProducts(sessionId) {
  // Extract from shadow DOM of wc-product-tile web components
  const result = await action(sessionId, {
    type: "evaluate",
    expression: `(() => {
      const tiles = document.querySelectorAll('wc-product-tile');
      return Array.from(tiles).map(t => {
        const shadow = t.shadowRoot;
        if (!shadow) return null;
        const link = shadow.querySelector('a[aria-label]');
        return link ? { ariaLabel: link.getAttribute('aria-label') || '' } : null;
      }).filter(Boolean);
    })()`,
  });
  return result.value || [];
}

async function scrapeCategory(sessionId, category) {
  const url = `https://www.woolworths.com.au/shop/browse/${category.slug}`;
  process.stderr.write(`  → ${category.label} (${url})\n`);

  await action(sessionId, { type: "goto", url, waitUntil: "domcontentloaded", timeout: 30000 });
  await action(sessionId, { type: "waitForTimeout", timeout: 3000 });

  // Scroll to load lazy tiles
  await scrollAndLoad(sessionId);

  const rawItems = await extractProducts(sessionId);

  return rawItems
    .map((item) => parseAriaLabel(item.ariaLabel))
    .filter((p) => p !== null && p.price > 0)
    .map((p) => ({
      name: p.name,
      price: p.price,
      priceRaw: `$${p.price.toFixed(2)}`,
      unitPrice: p.unitPrice,
      unit: normaliseUnit(p.unit),
      category: category.label,
      categorySlug: category.slug,
    }));
}

function normaliseUnit(raw) {
  if (!raw) return "each";
  const u = raw.toLowerCase().replace(/\s+/g, "");
  if (u.includes("kg") && !u.includes("100g")) return "kg";
  if (u.includes("100g")) return "100g";
  if (u.includes("litre") || u.includes("1l")) return "litre";
  if (u.includes("100ml")) return "100ml";
  return "each";
}

async function main() {
  const outFile = process.argv.includes("-o")
    ? process.argv[process.argv.indexOf("-o") + 1]
    : null;

  process.stderr.write(`Woolworths scraper — connecting to ${SERVICE}\n`);

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

    // Step 1: Homepage first — acquire bot protection cookies
    process.stderr.write("Acquiring cookies via homepage...\n");
    await action(sessionId, {
      type: "goto",
      url: "https://www.woolworths.com.au",
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await action(sessionId, { type: "waitForTimeout", timeout: 5000 });

    // Step 2: Sequential category crawl
    const allProducts = [];
    for (const cat of CATEGORIES) {
      try {
        const products = await scrapeCategory(sessionId, cat);
        allProducts.push(...products);
        process.stderr.write(`    ✓ ${products.length} products\n`);
      } catch (err) {
        process.stderr.write(`    ✗ ${cat.label}: ${err.message}\n`);
      }
      await action(sessionId, { type: "waitForTimeout", timeout: 2000 });
    }

    const result = {
      meta: {
        source: "Woolworths Online",
        scraped: new Date().toISOString(),
        categories: CATEGORIES.length,
        totalProducts: allProducts.length,
        url: "https://www.woolworths.com.au",
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
