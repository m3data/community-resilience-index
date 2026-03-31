import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  Pulse,
  Warning,
  TrendUp,
  ChartLine,
  Lightning,
  Plant,
  CurrencyDollar,
  FirstAid,
  Newspaper,
} from "@phosphor-icons/react/dist/ssr";
import { fetchSignals } from "@/lib/signals";
import type { Signal, Trend, CascadeLayer } from "@/lib/signals/types";

export const revalidate = 300; // cache rendered page for 5 minutes

export const metadata: Metadata = {
  title: "Signal Intelligence — Community Resilience Index",
  description:
    "Cascading failure early warning for Australian communities. Upstream market signals, fuel supply, food prices, economic pressure, and emergency feeds — live from public data.",
};

/** Cascade layer definitions — the propagation path */
const CASCADE_LAYERS: {
  layer: CascadeLayer;
  heading: string;
  timing: string;
  description: string;
  icon: React.ReactNode;
  keys: string[];
  defaultExpanded: boolean;
}[] = [
  {
    layer: 1,
    heading: "What's driving prices",
    timing: "Global markets and currency",
    description:
      "Oil prices, refining costs, and the Australian dollar. These are the forces that set the baseline cost of fuel before it reaches Australia.",
    icon: <ChartLine size={18} weight="duotone" />,
    keys: ["brentCrude", "crackSpread", "audUsd", "asxEnergy", "asxFood"],
    defaultExpanded: false,
  },
  {
    layer: 2,
    heading: "What we're working with",
    timing: "Fuel stocks and energy supply",
    description:
      "How much fuel Australia actually has on hand, and what the government is doing about it. These numbers are often hard to find — we put them in one place.",
    icon: <Lightning size={18} weight="duotone" />,
    keys: ["productReserves", "ieaCompliance", "stockVolumes", "energyPolicyNews", "aemoElectricity"],
    defaultExpanded: false,
  },
  {
    layer: 3,
    heading: "The wholesale floor",
    timing: "What retailers pay",
    description:
      "Terminal gate prices — the minimum that fuel companies charge before adding their retail margin. When these go up, pump prices follow. City-level data from BP, Ampol, Viva Energy, and ExxonMobil.",
    icon: <TrendUp size={18} weight="duotone" />,
    keys: ["dieselTgp", "petrolTgp"],
    defaultExpanded: true,
  },
  {
    layer: 4,
    heading: "What you're paying",
    timing: "Pump prices and grocery costs",
    description:
      "The prices you actually see — at the bowser, at the supermarket, and in the gap between wholesale and retail.",
    icon: <TrendUp size={18} weight="duotone" />,
    keys: ["cascadePressure", "retailMargin", "waFuel", "nswFuel", "stationAvailability", "foodBasket", "supermarketPrices"],
    defaultExpanded: true,
  },
  {
    layer: 5,
    heading: "What compounds over time",
    timing: "The slower squeeze",
    description:
      "Interest rates, fertiliser costs, and other pressures that build gradually. No single one is a crisis on its own, but together they add up.",
    icon: <CurrencyDollar size={18} weight="duotone" />,
    keys: ["rbaCashRate", "farmInputs"],
    defaultExpanded: true,
  },
  {
    layer: 6,
    heading: "Active emergencies",
    timing: "Bushfires and severe weather",
    description:
      "Natural disasters that disrupt supply chains. When these hit a region that's already under fuel or food pressure, the impact multiplies.",
    icon: <FirstAid size={18} weight="duotone" />,
    keys: ["nswRfs", "vicEmv"],
    defaultExpanded: true,
  },
];

interface LayerStatus {
  trend: Trend;
  label: string;
}

function getLayerStatus(
  signals: Record<string, Signal>,
  keys: string[]
): LayerStatus {
  const present = keys.filter((k) => signals[k]);
  if (present.length === 0) return { trend: "stable", label: "No data" };

  const criticalCount = present.filter((k) => signals[k].trend === "critical").length;
  const upCount = present.filter((k) => signals[k].trend === "up").length;
  const downCount = present.filter((k) => signals[k].trend === "down").length;
  const elevatedCount = criticalCount + upCount;
  const total = present.length;

  if (elevatedCount === 0 && downCount > 0) {
    return { trend: "down", label: "Easing" };
  }
  if (elevatedCount === 0) {
    return { trend: "stable", label: "Stable" };
  }
  if (criticalCount > total / 2) {
    return { trend: "critical", label: `${criticalCount} of ${total} critical` };
  }
  if (elevatedCount === total) {
    return { trend: criticalCount > 0 ? "critical" : "up", label: "All elevated" };
  }
  // Mixed — some elevated, some not
  return {
    trend: criticalCount > 0 ? "critical" : "up",
    label: `${elevatedCount} of ${total} elevated`,
  };
}

function getCascadeStatus(signals: Record<string, Signal>): {
  headline: string;
  detail: string;
} {
  const allSignals = Object.values(signals);
  const criticalCount = allSignals.filter(
    (s) => s.trend === "critical"
  ).length;
  const upCount = allSignals.filter((s) => s.trend === "up").length;

  // Check upstream vs retail
  const upstreamKeys = ["brentCrude", "crackSpread", "audUsd", "asxEnergy"];
  const upstreamStress = upstreamKeys.some(
    (k) => signals[k]?.trend === "critical" || signals[k]?.trend === "up"
  );
  const retailKeys = ["waFuel", "nswFuel", "foodBasket"];
  const retailStress = retailKeys.some(
    (k) => signals[k]?.trend === "critical" || signals[k]?.trend === "up"
  );
  const emergencyActive = ["nswRfs", "vicEmv"].some(
    (k) => signals[k]?.trend === "critical" || signals[k]?.trend === "up"
  );

  if (criticalCount >= 3 || emergencyActive) {
    return {
      headline: "Multiple pressures active right now",
      detail:
        "Costs are elevated across several parts of the supply chain. Scroll down to see what's driving it and what it means for your area.",
    };
  }
  if (upstreamStress && !retailStress) {
    return {
      headline: "Costs are rising behind the scenes",
      detail:
        "Oil prices, refining costs, or the dollar are putting pressure on fuel costs — but it hasn't fully shown up at the pump or supermarket yet. It may be absorbed by retailers, or it may flow through.",
    };
  }
  if (upstreamStress && retailStress) {
    return {
      headline: "Higher costs are flowing through to what you pay",
      detail:
        "The forces driving prices up are now visible at the bowser and in grocery costs. The layers below show where the pressure is coming from.",
    };
  }
  if (retailStress && !upstreamStress) {
    return {
      headline: "Prices are high but the pressure behind them has eased",
      detail:
        "What you're paying is still elevated, but the upstream costs that caused it have come down. Prices often take time to follow — or retailers may be maintaining margins.",
    };
  }
  if (upCount > 0) {
    return {
      headline: "Some costs are moving",
      detail: `${upCount} signal${upCount > 1 ? "s are" : " is"} showing movement. Nothing at critical levels yet.`,
    };
  }
  return {
    headline: "Things are relatively stable",
    detail:
      "No major stress showing across fuel or food supply chains right now.",
  };
}

export default async function SignalsPage() {
  const { lastFetched, signals } = await fetchSignals();

  const fetchTime = new Date(lastFetched).toLocaleString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const automatedCount = Object.values(signals).filter(
    (s) => s?.automated
  ).length;

  const cascadeStatus = getCascadeStatus(signals);

  return (
    <div>
      {/* Status layer — the single read above the fold */}
      <section className="bg-amber-950 bg-topo text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Warning size={20} weight="duotone" className="text-amber-400" />
            <p className="text-amber-400 font-medium text-xs sm:text-sm uppercase tracking-wide">
              Live signals
            </p>
          </div>

          <h1 className="font-heading text-xl sm:text-3xl font-bold leading-tight max-w-2xl">
            {cascadeStatus.headline}
          </h1>
          <p className="mt-2 sm:mt-3 text-amber-100 text-sm sm:text-lg max-w-2xl leading-relaxed">
            {cascadeStatus.detail}
          </p>

          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
            <span className="text-amber-300/60 text-xs sm:text-sm">{fetchTime}</span>
            {automatedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-900/40 px-2.5 py-1 rounded-full text-[11px] sm:text-xs">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {automatedCount} live sources
              </span>
            )}
          </div>

          <div className="mt-4 sm:mt-6 bg-amber-950/60 border border-amber-700/30 rounded-lg p-3 sm:p-4 max-w-2xl">
            <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed">
              This page shows where pressure is building in the supply chain
              — from upstream markets to the prices you pay. Signals are
              sourced from public data. We name the gaps the government
              doesn&apos;t.
            </p>
          </div>
        </div>
      </section>

      {/* Cascade flow */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-2">
          {CASCADE_LAYERS.map((layerDef, idx) => {
            const layerSignals = layerDef.keys
              .filter((key) => key in signals && signals[key] !== null)
              .map((key) => ({ key, signal: signals[key] }));

            if (layerSignals.length === 0) return null;

            const layerStatus = getLayerStatus(signals, layerDef.keys);
            const isLast = idx === CASCADE_LAYERS.length - 1;

            return (
              <div key={layerDef.layer}>
                <CascadeLayerSection
                  layer={layerDef}
                  status={layerStatus}
                  signals={layerSignals}
                />
                {/* Propagation arrow between layers */}
                {!isLast && (
                  <div className="flex justify-center py-1">
                    <ArrowDown
                      size={20}
                      weight="bold"
                      className="text-gray-300"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* How signals connect to resilience */}
      <section className="bg-green-50 border-y border-green-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 mb-4">
            <Pulse size={20} weight="duotone" className="text-green-700" />
            <h2 className="font-heading text-xl font-bold text-green-900">
              How signals connect to resilience
            </h2>
          </div>
          <div className="text-gray-700 space-y-3 max-w-3xl leading-relaxed">
            <p>
              The{" "}
              <Link
                href="/your-place"
                className="text-green-700 underline underline-offset-2 hover:text-green-900"
              >
                Community Resilience Index
              </Link>{" "}
              measures structural capacity — the slow-moving factors that
              shape how well a community can absorb shocks. These signals
              provide the real-time context. The structural score tells you
              where the cracks are. The signals tell you how much weight is on
              them right now.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-green-900 bg-topo text-white rounded-xl p-6 sm:p-10 text-center">
          <h2 className="font-heading text-lg sm:text-2xl font-bold mb-3 sm:mb-4">
            Data without action is anxiety. Data with structure is agency.
          </h2>
          <p className="text-green-100 text-base sm:text-lg max-w-2xl mx-auto mb-4 sm:mb-6">
            Understanding the cascade is step one. Organising your community
            is what makes the difference.
          </p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-green-900 font-semibold px-8 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-green-900"
          >
            Community Resilience Guide
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─── Cascade Layer Section ─── */

const layerStatusStyles: Record<Trend, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  up: "bg-amber-100 text-amber-800 border-amber-200",
  down: "bg-blue-100 text-blue-800 border-blue-200",
  stable: "bg-green-100 text-green-800 border-green-200",
};

const layerBorderStyles: Record<Trend, string> = {
  critical: "border-l-red-400",
  up: "border-l-amber-400",
  down: "border-l-blue-300",
  stable: "border-l-green-300",
};

function CascadeLayerSection({
  layer,
  status,
  signals,
}: {
  layer: (typeof CASCADE_LAYERS)[number];
  status: LayerStatus;
  signals: { key: string; signal: Signal }[];
}) {
  return (
    <details open={layer.defaultExpanded || status.trend === "critical"}>
      <summary className={`cursor-pointer select-none rounded-lg border border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden`}>
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-gray-400 flex-shrink-0">
              {layer.icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-sm sm:text-base font-semibold text-green-900">
                  {layer.heading}
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${layerStatusStyles[status.trend]}`}
                >
                  {status.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">
                {layer.timing}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {signals.length} signal{signals.length !== 1 ? "s" : ""}
          </span>
        </div>
      </summary>

      <div className={`mt-1 border-l-4 ${layerBorderStyles[status.trend]} ml-1 sm:ml-3 pl-3 sm:pl-5 pb-2 space-y-3`}>
        <p className="text-xs sm:text-sm text-gray-500 pt-2">{layer.description}</p>

        {signals.map(({ key, signal }) => (
          <SignalCard key={key} signalKey={key} signal={signal} />
        ))}
      </div>
    </details>
  );
}

/* ─── Temporal window labels ─── */

/** How often the underlying data refreshes and what window it represents.
 *  This is a presentation concern — the cadence of the source, not when we last fetched. */
const TEMPORAL_WINDOW: Record<string, string> = {
  // Layer 1: Upstream market — intraday feeds
  brentCrude: "Intraday",
  crackSpread: "Intraday",
  audUsd: "Intraday",
  asxEnergy: "Intraday",
  asxFood: "Intraday",
  // Layer 2: Supply position
  productReserves: "Weekly report",
  ieaCompliance: "Weekly report",
  stockVolumes: "Weekly report",
  energyPolicyNews: "Rolling 7 days",
  aemoElectricity: "5-min intervals",
  // Layer 3: Wholesale
  dieselTgp: "Daily",
  petrolTgp: "Daily",
  // Layer 4: Retail
  waFuel: "Daily",
  nswFuel: "Live (5 min cache)",
  retailMargin: "Daily (derived)",
  cascadePressure: "Daily (derived)",
  foodBasket: "Quarterly",
  stationAvailability: "Daily snapshot",
  supermarketPrices: "Point-in-time scrape",
  // Layer 5: Downstream
  rbaCashRate: "Set at RBA board meetings",
  farmInputs: "Periodic estimate",
  // Layer 6: Emergency
  nswRfs: "Live feed",
  vicEmv: "Live feed",
};

/* ─── Card type classification ─── */

const INTELLIGENCE_SIGNALS = new Set([
  "cascadePressure",
  "retailMargin",
  "productReserves",
  "ieaCompliance",
  "stockVolumes",
  "energyPolicyNews",
  "farmInputs",
  "stationAvailability",
]);

/* ─── Shared utilities ─── */

const trendStyles: Record<Trend, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  down: "bg-blue-50 text-blue-700 border-blue-200",
  up: "bg-amber-50 text-amber-700 border-amber-200",
  stable: "bg-green-50 text-green-700 border-green-200",
};

const metricBadgeLabel: Record<Trend, string> = {
  critical: "Critical",
  up: "Elevated",
  down: "Easing",
  stable: "Stable",
};

const intelBadgeLabel: Record<Trend, string> = {
  critical: "Worsening",
  up: "Watch",
  down: "Improving",
  stable: "Stable",
};

function formatLastUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/* ─── Sparkline ─── */

const SPARKLINE_COLORS: Record<Trend, { stroke: string; fill: string }> = {
  critical: { stroke: "#dc2626", fill: "rgba(220,38,38,0.08)" },
  up: { stroke: "#b45309", fill: "rgba(180,83,9,0.08)" },
  down: { stroke: "#2563eb", fill: "rgba(37,99,235,0.08)" },
  stable: { stroke: "#4d7c0f", fill: "rgba(77,124,15,0.08)" },
};

function Sparkline({ values, trend, label }: { values: number[]; trend: Trend; label?: string }) {
  if (values.length < 2) return null;

  const w = 120;
  const h = 32;
  const pad = 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const fillPath = `${linePath} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;
  const colors = SPARKLINE_COLORS[trend];

  return (
    <div className="mt-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <path d={fillPath} fill={colors.fill} />
        <path d={linePath} fill="none" stroke={colors.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={colors.stroke} />
      </svg>
      {label && <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>}
    </div>
  );
}

function SourceLine({ source, sourceUrl, automated }: { source: string; sourceUrl?: string; automated: boolean }) {
  return (
    <p className="text-[11px] text-gray-400 flex-shrink-0 text-right flex items-center gap-1.5">
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gray-600">
          {source}
        </a>
      ) : source}
      {automated && (
        <span className="inline-flex items-center gap-0.5 text-green-600" title="Live data">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        </span>
      )}
    </p>
  );
}

/* ─── Metric Card ─── */

function MetricCard({ signalKey, signal }: { signalKey: string; signal: Signal }) {
  const updatedLabel = formatLastUpdated(signal.lastUpdated);
  const temporalWindow = TEMPORAL_WINDOW[signalKey];

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-5">
      {/* Header: badge + source */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${trendStyles[signal.trend]}`}>
          {metricBadgeLabel[signal.trend]}
        </span>
        <SourceLine source={signal.source} sourceUrl={signal.sourceUrl} automated={signal.automated} />
      </div>

      {/* Big value */}
      <p className="font-heading text-2xl sm:text-3xl font-bold text-green-900 leading-tight">
        {signal.value}
      </p>
      <p className="text-sm text-gray-600 mt-0.5">{signal.label}</p>

      {/* Sparkline */}
      {signal.sparkline && (
        <Sparkline values={signal.sparkline.values} trend={signal.trend} label={signal.sparkline.label} />
      )}

      {/* Freshness */}
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
        {temporalWindow && (
          <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{temporalWindow}</span>
        )}
        {updatedLabel && <span>{updatedLabel}</span>}
      </div>

      {/* Secondary insight (e.g. futures curve) */}
      {signal.secondary && (
        <div className="mt-3 bg-amber-50/50 border border-amber-100 rounded px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">{signal.secondary.label}</p>
          <p className="text-sm text-amber-900 mt-0.5">{signal.secondary.value}</p>
          {signal.secondary.detail && (
            <p className="text-xs text-amber-600 mt-1">{signal.secondary.detail}</p>
          )}
        </div>
      )}

      {/* Components grid */}
      {signal.components && signal.components.length > 0 && (
        <div className="mt-3 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
          {signal.components.map((c) => (
            <div key={c.label} className="bg-gray-50 rounded px-3 py-2 text-sm">
              <p className="text-[11px] text-gray-500">{c.label}</p>
              <p className="font-medium text-gray-900 text-sm">
                {c.value}
                {c.change && (
                  <span className={`ml-1 text-xs ${c.trend === "critical" || c.trend === "up" ? "text-amber-600" : c.trend === "down" ? "text-blue-600" : "text-gray-500"}`}>
                    {c.change}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Regional breakdown */}
      {signal.regions && signal.regions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {signal.regions.map((r) => (
            <div key={r.region} className={`rounded px-3 py-1.5 text-sm border ${r.trend === "critical" ? "bg-red-50 border-red-200" : r.trend === "up" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-xs text-gray-500">{r.region}</span>{" "}
              <span className="font-medium text-gray-900">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Context — one sentence for metric cards */}
      <p className="mt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{signal.context}</p>
    </div>
  );
}

/* ─── Intelligence Card ─── */

function IntelligenceCard({ signalKey, signal }: { signalKey: string; signal: Signal }) {
  const updatedLabel = formatLastUpdated(signal.lastUpdated);

  // Split context: first sentence becomes the lead, rest is supporting detail
  const contextParts = signal.context.split(/(?<=\.)\s+/);
  const leadInsight = contextParts.slice(0, 2).join(" ");
  const supportingDetail = contextParts.length > 2 ? contextParts.slice(2).join(" ") : null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-5">
      {/* Header: badge + freshness */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${trendStyles[signal.trend]}`}>
          {intelBadgeLabel[signal.trend]}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {updatedLabel && <span>{updatedLabel}</span>}
          <SourceLine source={signal.source} sourceUrl={signal.sourceUrl} automated={signal.automated} />
        </div>
      </div>

      {/* Headline — replaces the big number */}
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
        {signal.value}
      </h3>
      <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{signal.label}</p>

      {/* Sparkline */}
      {signal.sparkline && (
        <Sparkline values={signal.sparkline.values} trend={signal.trend} label={signal.sparkline.label} />
      )}

      {/* Lead insight — the primary content, elevated from buried context */}
      <p className="mt-3 text-sm text-gray-700 leading-relaxed">
        {leadInsight}
      </p>

      {/* Secondary insight */}
      {signal.secondary && (
        <div className="mt-3 bg-amber-50/50 border border-amber-100 rounded px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">{signal.secondary.label}</p>
          <p className="text-sm text-amber-900 mt-0.5">{signal.secondary.value}</p>
          {signal.secondary.detail && (
            <p className="text-xs text-amber-600 mt-1">{signal.secondary.detail}</p>
          )}
        </div>
      )}

      {/* Supporting figures — inline row, not a grid */}
      {signal.components && signal.components.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
          {signal.components.map((c) => (
            <div key={c.label} className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{c.value}</span>
              <span className="text-xs text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Regional breakdown */}
      {signal.regions && signal.regions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
          {signal.regions.map((r) => (
            <div key={r.region} className={`rounded px-3 py-1.5 text-sm border ${r.trend === "critical" ? "bg-red-50 border-red-200" : r.trend === "up" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-xs text-gray-500">{r.region}</span>{" "}
              <span className="font-medium text-gray-900">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Supporting detail — the rest of the context */}
      {supportingDetail && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            More detail
          </summary>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{supportingDetail}</p>
        </details>
      )}
    </div>
  );
}

/* ─── Signal Card dispatcher ─── */

function SignalCard({ signalKey, signal }: { signalKey: string; signal: Signal }) {
  if (INTELLIGENCE_SIGNALS.has(signalKey)) {
    return <IntelligenceCard signalKey={signalKey} signal={signal} />;
  }
  return <MetricCard signalKey={signalKey} signal={signal} />;
}
