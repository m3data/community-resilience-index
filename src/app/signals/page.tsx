import type { Metadata } from "next";
import Link from "next/link";
import {
  Lightning,
  ShoppingCart,
  Newspaper,
  ArrowRight,
  Pulse,
  Warning,
  TrendUp,
  Plant,
} from "@phosphor-icons/react/dist/ssr";
import { fetchSignals } from "@/lib/signals";
import type { Signal, Trend } from "@/lib/signals/types";

export const metadata: Metadata = {
  title: "Signals — Community Resilience Index",
  description:
    "Live data on fuel reserves, diesel prices, demand pressure, farm input costs, and food prices. What Australian communities need to know right now.",
};

type SignalCategory = {
  heading: string;
  description?: string;
  icon: React.ReactNode;
  keys: string[];
};

const CATEGORIES: SignalCategory[] = [
  {
    heading: "Energy & Fuel",
    description:
      "Reserve levels, pricing, and demand behaviour. Government headline figures include fuel on water and in pipelines — we flag that distinction.",
    icon: <Lightning size={20} weight="duotone" />,
    keys: ["reserves", "demandPressure", "diesel", "nswDiesel", "waDiesel"],
  },
  {
    heading: "Food & Agricultural Inputs",
    description:
      "Food prices lag. Farm input costs lead. When fertiliser and fuel spike simultaneously, planting decisions change and food supply contracts months later.",
    icon: <Plant size={20} weight="duotone" />,
    keys: ["farmInputs", "food"],
  },
  {
    heading: "Media Attention",
    icon: <Newspaper size={20} weight="duotone" />,
    keys: ["newsVolume"],
  },
];

export default async function SignalsPage() {
  const { lastFetched, signals } = await fetchSignals();

  const fetchDate = new Date(lastFetched).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const automatedCount = Object.values(signals).filter(
    (s) => s?.automated
  ).length;

  return (
    <div>
      {/* Header */}
      <section className="bg-amber-950 bg-topo text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Warning size={24} weight="duotone" className="text-amber-400" />
            <p className="text-amber-400 font-medium text-sm uppercase tracking-wide">
              Live situation
            </p>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
            Signals
          </h1>
          <p className="mt-4 text-amber-100 text-lg max-w-2xl">
            Australia is in a fuel supply crisis. The Strait of Hormuz
            disruption has cut access to the shipping routes that supply 90% of
            our refined fuel. These are the numbers the public needs to see
            — sourced from government data, with the caveats the
            government isn&apos;t making clear.
          </p>
          <div className="mt-6 bg-amber-950/60 border border-amber-700/40 rounded-lg p-4 max-w-2xl">
            <p className="text-sm text-amber-200 leading-relaxed">
              <strong className="text-amber-400">
                A note on government figures:
              </strong>{" "}
              The Minimum Stockholding Obligation (MSO) headline numbers
              reported by government include fuel on coastal vessels, in
              pipelines, and within Australia&apos;s exclusive economic zone
              — fuel over which Australia may have limited sovereign control
              in a crisis. Actual onshore controllable reserves are lower than
              the headline figures. We show the official numbers and name the
              gap.
            </p>
          </div>
          <p className="mt-4 text-sm text-amber-300/60">
            Last fetched: {fetchDate}
            {automatedCount > 0 && (
              <span className="ml-2 text-amber-300">
                ({automatedCount} live sources)
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Signal cards by category */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-12">
          {CATEGORIES.map((category) => {
            const categorySignals = category.keys
              .filter((key) => key in signals && signals[key] !== null)
              .map((key) => ({ key, signal: signals[key] }));

            if (categorySignals.length === 0) return null;

            return (
              <div key={category.heading}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">{category.icon}</span>
                  <h2 className="font-heading text-lg font-semibold text-green-900">
                    {category.heading}
                  </h2>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-500 mb-5 max-w-2xl">
                    {category.description}
                  </p>
                )}
                <div className="space-y-4">
                  {categorySignals.map(({ key, signal }) => (
                    <SignalCard key={key} {...signal} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What the numbers don't show */}
      <section className="bg-amber-50 border-y border-amber-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 mb-4">
            <TrendUp size={20} weight="duotone" className="text-amber-700" />
            <h2 className="font-heading text-xl font-bold text-green-900">
              What the numbers don&apos;t show
            </h2>
          </div>
          <div className="text-gray-700 space-y-3 max-w-3xl leading-relaxed">
            <p>
              Even if national fuel supply were adequate, distribution is a
              separate vulnerability. Australia has{" "}
              <strong>zero Australian-flagged coastal tankers</strong> — all
              five were withdrawn between 2014 and 2016. Fuel moves around the
              coast on foreign-flagged vessels. Pipelines, terminals, and road
              tankers each have their own capacity limits.
            </p>
            <p>
              Downstream effects are already cascading. Fertiliser prices are up
              ~30% because they travel the same disrupted shipping routes.
              Farmers making winter planting decisions now are facing a double
              hit: fuel costs and input costs rising simultaneously. Food price
              increases will follow with a 3–6 month lag.
            </p>
            <p>
              AVM John Blackburn (former Deputy Chief of the RAAF, IIER-A) has
              outlined five options for boosting domestic fuel supply — from
              enforcing ethanol blending mandates (6 months) to refinery
              retooling (18+ months) to renewable diesel infrastructure (3+
              years). Even the fastest option requires political will that
              hasn&apos;t materialised in 15 years of warnings.
            </p>
          </div>
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
              measures structural capacity — the slow-moving factors like
              economic diversity, infrastructure access, and social cohesion that
              shape how well a community can absorb shocks. These signals
              provide the real-time context.
            </p>
            <p>
              When fuel prices rise, communities with low economic diversity and
              high car dependency feel it first. When food costs climb, places
              with fewer local food sources and lower household buffers are more
              exposed. The structural score tells you where the cracks are. The
              signals tell you how much weight is on them right now.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-green-900 bg-topo text-white rounded-xl p-8 sm:p-10 text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">
            Data without action is anxiety. Data with a plan is power.
          </h2>
          <p className="text-green-100 text-lg max-w-2xl mx-auto mb-6">
            Understanding the situation is step one. Organising your community
            is what makes the difference. This is not a drill.
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

      {/* Sources */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <h3 className="font-heading font-semibold text-green-900 mb-4">
          Sources
        </h3>
        <div className="text-sm text-gray-500 space-y-1">
          <p>
            Department of Climate Change, Energy, the Environment and Water —
            Australian Petroleum Statistics (monthly)
          </p>
          <p>
            Australian Institute of Petroleum — Terminal Gate Prices &amp;
            weekly retail reports (daily/weekly)
          </p>
          <p>
            Australian Bureau of Statistics — Consumer Price Index, Producer
            Price Index (quarterly)
          </p>
          <p>
            NSW FuelCheck — diesel prices across New South Wales via
            data.nsw.gov.au (daily)
          </p>
          <p>
            WA FuelWatch — daily diesel prices across Western Australia (RSS)
          </p>
          <p>
            ABARES / industry reporting — farm input costs, fertiliser
            (periodic)
          </p>
          <p>Google News AU — fuel supply coverage volume (RSS)</p>
          <p>
            Parliamentary statements, Energy Minister briefings — demand-side
            data
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Automated signals are fetched from public APIs and cached for 24
          hours. Manual signals are updated from official sources as new data is
          published. Values shown are indicative and may lag real-time
          conditions. We source from government data and name the limitations
          the government doesn&apos;t.
        </p>
      </section>
    </div>
  );
}

function SignalCard({ label, value, trend, source, sourceUrl, context, automated }: Signal) {
  const trendStyles: Record<Trend, string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    down: "bg-red-50 text-red-700 border-red-200",
    up: "bg-amber-50 text-amber-700 border-amber-200",
    stable: "bg-green-50 text-green-700 border-green-200",
  };

  const trendIcon: Record<Trend, string> = {
    critical: "!!",
    up: "\u2191",
    down: "\u2193",
    stable: "\u2192",
  };

  const trendLabel: Record<Trend, string> = {
    critical: "Critical",
    up: "Increasing",
    down: "Decreasing",
    stable: "Stable",
  };

  return (
    <div className="bg-white/80 border border-green-100 rounded-xl p-6 flex flex-col sm:flex-row gap-4 card-hover">
      <div className="sm:w-48 flex-shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="font-heading text-2xl font-bold text-green-900">
            {value}
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${trendStyles[trend]}`}
            role="status"
            aria-label={`Trend: ${trendLabel[trend]}`}
          >
            <span aria-hidden="true">{trendIcon[trend]}</span>
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-600 transition-colors"
              title="Verify this data at source"
            >
              {source}
            </a>
          ) : (
            source
          )}
          {automated && (
            <span
              className="ml-1 inline-flex items-center gap-0.5 text-green-600"
              title="Updating from live data source"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 12 12"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="6" cy="6" r="4" />
              </svg>
              <span className="sr-only">Live data</span>
            </span>
          )}
        </p>
      </div>
      <div className="flex-1 sm:border-l sm:border-green-100 sm:pl-6">
        <p className="text-sm text-gray-600 leading-relaxed">{context}</p>
      </div>
    </div>
  );
}
