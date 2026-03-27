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
    heading: "Upstream pressure",
    timing: "Days to weeks ahead",
    description:
      "Futures curves, refining margins, and equity markets. These aggregate thousands of actors pricing in risk before it reaches the pump.",
    icon: <ChartLine size={18} weight="duotone" />,
    keys: ["brentCrude", "crackSpread", "audUsd", "asxEnergy", "asxFood"],
    defaultExpanded: false,
  },
  {
    layer: 2,
    heading: "Supply position",
    timing: "Current state",
    description:
      "Physical fuel stocks and energy supply. What the government knows but doesn't always communicate clearly.",
    icon: <Lightning size={18} weight="duotone" />,
    keys: ["reserves", "productReserves", "ieaCompliance", "stockVolumes", "energyPolicyNews", "aemoElectricity"],
    defaultExpanded: false,
  },
  {
    layer: 3,
    heading: "Wholesale prices",
    timing: "Days ahead of the pump",
    description:
      "Terminal gate prices — the wholesale floor before retail margin is added. When these rise, pump prices follow within days. City-level data from BP, Ampol, Viva Energy, and ExxonMobil.",
    icon: <TrendUp size={18} weight="duotone" />,
    keys: ["dieselTgp", "petrolTgp"],
    defaultExpanded: true,
  },
  {
    layer: 4,
    heading: "Retail impact",
    timing: "What you see now",
    description:
      "Pump prices, food costs, station closures. This is where most public attention sits — but it lags the layers above.",
    icon: <TrendUp size={18} weight="duotone" />,
    keys: ["cascadePressure", "retailMargin", "demandPressure", "waDiesel", "waPetrol", "food", "foodBasket", "supermarketPrices", "newsVolume"],
    defaultExpanded: true,
  },
  {
    layer: 5,
    heading: "Downstream cascade",
    timing: "Weeks to months",
    description:
      "Interest rates, farm input costs, housing. Individual stresses compound — no single indicator captures the cumulative weight.",
    icon: <CurrencyDollar size={18} weight="duotone" />,
    keys: ["rbaCashRate", "farmInputs"],
    defaultExpanded: true,
  },
  {
    layer: 6,
    heading: "Emergency",
    timing: "Active incidents",
    description:
      "Bushfires, floods, and severe weather compound supply chain disruption. A natural disaster in a region already under fuel stress creates multiplicative pressure.",
    icon: <FirstAid size={18} weight="duotone" />,
    keys: ["nswRfs", "vicEmv"],
    defaultExpanded: true,
  },
];

function getLayerStatus(
  signals: Record<string, Signal>,
  keys: string[]
): Trend {
  let worst: Trend = "stable";
  for (const key of keys) {
    const s = signals[key];
    if (!s) continue;
    if (s.trend === "critical") return "critical";
    if (s.trend === "up") worst = "up";
    if (s.trend === "down" && worst === "stable") worst = "down";
  }
  return worst;
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
  const retailKeys = ["demandPressure", "waDiesel", "food"];
  const retailStress = retailKeys.some(
    (k) => signals[k]?.trend === "critical" || signals[k]?.trend === "up"
  );
  const emergencyActive = ["nswRfs", "vicEmv"].some(
    (k) => signals[k]?.trend === "critical" || signals[k]?.trend === "up"
  );

  if (criticalCount >= 3 || emergencyActive) {
    return {
      headline: "Multiple stress signals active",
      detail:
        "Pressure visible across upstream markets and retail. Active monitoring recommended. Check the emergency section if you are in an affected area.",
    };
  }
  if (upstreamStress && !retailStress) {
    return {
      headline: "Upstream pressure building",
      detail:
        "Market signals and supply indicators are showing stress that has not yet fully reached retail prices. If this propagates normally, expect fuel and food price increases in the coming weeks.",
    };
  }
  if (upstreamStress && retailStress) {
    return {
      headline: "Pressure propagating through the supply chain",
      detail:
        "Upstream stress is now visible at the retail level. Fuel prices, food costs, or both are elevated. The layers below show how this is compounding.",
    };
  }
  if (retailStress && !upstreamStress) {
    return {
      headline: "Retail stress without upstream pressure",
      detail:
        "Prices are elevated but upstream signals are not showing new pressure. This may indicate a lag from earlier disruption, or localised supply issues.",
    };
  }
  if (upCount > 0) {
    return {
      headline: "Some signals elevated",
      detail: `${upCount} signal${upCount > 1 ? "s" : ""} showing upward movement. No critical thresholds breached. Monitoring continues.`,
    };
  }
  return {
    headline: "Baseline conditions",
    detail:
      "No significant stress signals detected across the cascade. Supply chains operating within normal parameters.",
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-6">
            <Warning size={22} weight="duotone" className="text-amber-400" />
            <p className="text-amber-400 font-medium text-sm uppercase tracking-wide">
              Signal intelligence
            </p>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            {cascadeStatus.headline}
          </h1>
          <p className="mt-3 text-amber-100 text-base sm:text-lg max-w-2xl leading-relaxed">
            {cascadeStatus.detail}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-amber-300/60">{fetchTime}</span>
            {automatedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-900/40 px-2.5 py-1 rounded-full text-xs">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {automatedCount} live sources
              </span>
            )}
          </div>

          <div className="mt-6 bg-amber-950/60 border border-amber-700/30 rounded-lg p-4 max-w-2xl">
            <p className="text-sm text-amber-200/80 leading-relaxed">
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
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-green-900 bg-topo text-white rounded-xl p-8 sm:p-10 text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">
            Data without action is anxiety. Data with structure is agency.
          </h2>
          <p className="text-green-100 text-lg max-w-2xl mx-auto mb-6">
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

const layerStatusLabel: Record<Trend, string> = {
  critical: "Critical",
  up: "Elevated",
  down: "Easing",
  stable: "Stable",
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
  status: Trend;
  signals: { key: string; signal: Signal }[];
}) {
  return (
    <details open={layer.defaultExpanded || status === "critical"}>
      <summary className={`cursor-pointer select-none rounded-lg border border-gray-200 bg-white px-5 py-4 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-gray-400 flex-shrink-0">
              {layer.icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-semibold text-green-900">
                  {layer.heading}
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${layerStatusStyles[status]}`}
                >
                  {layerStatusLabel[status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {layer.timing}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {signals.length} signal{signals.length !== 1 ? "s" : ""}
          </span>
        </div>
      </summary>

      <div className={`mt-1 border-l-4 ${layerBorderStyles[status]} ml-3 pl-5 pb-2 space-y-3`}>
        <p className="text-sm text-gray-500 pt-2">{layer.description}</p>

        {signals.map(({ key, signal }) => (
          <SignalCard key={key} signal={signal} />
        ))}
      </div>
    </details>
  );
}

/* ─── Signal Card ─── */

const trendStyles: Record<Trend, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  down: "bg-blue-50 text-blue-700 border-blue-200",
  up: "bg-amber-50 text-amber-700 border-amber-200",
  stable: "bg-green-50 text-green-700 border-green-200",
};

const trendIcon: Record<Trend, string> = {
  critical: "!!",
  up: "\u2191",
  down: "\u2193",
  stable: "\u2192",
};

function SignalCard({ signal }: { signal: Signal }) {
  const {
    label,
    value,
    trend,
    source,
    sourceUrl,
    context,
    automated,
    components,
    regions,
    secondary,
    propagatesTo,
  } = signal;

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="font-heading text-xl sm:text-2xl font-bold text-green-900">
              {value}
            </p>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold border ${trendStyles[trend]}`}
            >
              {trendIcon[trend]}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 flex-shrink-0 text-right">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-600"
            >
              {source}
            </a>
          ) : (
            source
          )}
          {automated && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-green-600" title="Live data">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            </span>
          )}
        </p>
      </div>

      {/* Secondary insight (e.g. futures curve) */}
      {secondary && (
        <div className="mt-3 bg-amber-50/50 border border-amber-100 rounded px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">{secondary.label}</p>
          <p className="text-sm text-amber-900 mt-0.5">{secondary.value}</p>
          {secondary.detail && (
            <p className="text-xs text-amber-600 mt-1">{secondary.detail}</p>
          )}
        </div>
      )}

      {/* Composite components (ASX tickers etc.) */}
      {components && components.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {components.map((c) => (
            <div
              key={c.label}
              className="bg-gray-50 rounded px-3 py-2 text-sm"
            >
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="font-medium text-gray-900">
                {c.value}
                {c.change && (
                  <span
                    className={`ml-1 text-xs ${
                      c.trend === "critical" || c.trend === "up"
                        ? "text-amber-600"
                        : c.trend === "down"
                          ? "text-blue-600"
                          : "text-gray-500"
                    }`}
                  >
                    {c.change}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Regional breakdown (AEMO etc.) */}
      {regions && regions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {regions.map((r) => (
            <div
              key={r.region}
              className={`rounded px-3 py-1.5 text-sm border ${
                r.trend === "critical"
                  ? "bg-red-50 border-red-200"
                  : r.trend === "up"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-gray-50 border-gray-200"
              }`}
            >
              <span className="text-xs text-gray-500">{r.region}</span>{" "}
              <span className="font-medium text-gray-900">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Context */}
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{context}</p>

      {/* Propagation note */}
      {propagatesTo && (
        <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
          <ArrowDown size={12} weight="bold" className="flex-shrink-0" />
          Feeds into: {propagatesTo}
        </p>
      )}
    </div>
  );
}
