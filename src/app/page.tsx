import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Resilience Index — Australia",
  description:
    "Postcode-level exposure profiles for Australian communities. Structural shape, live signals, and what to do about it.",
  openGraph: {
    title: "Community Resilience Index — Australia",
    description:
      "Enter your postcode. See what pressures reach your community hardest and what to do about them.",
  },
};
import Image from "next/image";
import { ScrollReveal } from "@/app/components/ui";
import {
  MapPin,
  HandHeart,
  Plant,
  Database,
  BookOpen,
  Scales,
  Target,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-green-900 bg-topo text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <p className="text-amber-400 font-medium text-sm uppercase tracking-wide mb-4 animate-fade-up">
              Australia
            </p>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold leading-tight animate-fade-up delay-100">
              What pressures reach your community hardest?
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-green-100 max-w-2xl leading-relaxed">
              Enter your postcode. See your community&apos;s exposure profile &mdash;
              the structural shape that determines how fuel shocks, food prices, and
              economic pressure hit where you live. Official data. Transparent methods.
              Actions you can take.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/your-place"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-green-900 font-semibold px-6 py-3 rounded-lg transition-colors text-base focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-green-900"
              >
                <MapPin size={20} weight="bold" />
                Check Your Postcode
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium px-6 py-3 rounded-lg transition-colors text-base focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-green-900"
              >
                <BookOpen size={20} />
                How It Works
              </Link>
            </div>
          </div>
          {/* Peeps cluster */}
          <ScrollReveal direction="right" delay={400} className="hidden lg:flex items-end gap-2 opacity-90">
            <Image src="/peeps/standing-5.svg" alt="" width={120} height={280} className="drop-shadow-lg" aria-hidden="true" />
            <Image src="/peeps/standing-18.svg" alt="" width={110} height={260} className="drop-shadow-lg -ml-4" aria-hidden="true" />
            <Image src="/peeps/standing-25.svg" alt="" width={115} height={270} className="drop-shadow-lg -ml-3" aria-hidden="true" />
          </ScrollReveal>
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-green-900 mb-2 sm:mb-3">
          A profile, not a score
        </h2>
        <p className="text-gray-600 text-base sm:text-lg max-w-2xl mb-6 sm:mb-10">
          A single number hides the most useful information: <em>why</em> your
          community is exposed and <em>what</em> you can do about it. We show
          you the shape of your exposure instead.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="border border-gray-200 rounded-xl p-5 sm:p-6 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Your structure
            </p>
            <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">
              What shapes your exposure
            </h3>
            <p className="mt-2 sm:mt-3 text-sm text-gray-600 leading-relaxed">
              Car dependency, refinery distance, industry concentration,
              remoteness, housing stress. The characteristics that determine
              how supply chain disruptions reach your community.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 sm:p-6 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Your exposures
            </p>
            <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">
              Where pressure hits hardest
            </h3>
            <p className="mt-2 sm:mt-3 text-sm text-gray-600 leading-relaxed">
              Six domains &mdash; fuel, food, electricity, economic, housing,
              emergency &mdash; ranked by how exposed your specific community is.
              With the live signals most relevant to you.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 sm:p-6 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
              Your actions
            </p>
            <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">
              What to do about it
            </h3>
            <p className="mt-2 sm:mt-3 text-sm text-gray-600 leading-relaxed">
              Actions ranked by urgency, driven by your structural profile.
              Household steps, community organising, and advocacy &mdash; with
              links to the full resilience guide.
            </p>
          </div>
        </div>
      </section>

      {/* Diversity section */}
      <section className="bg-green-50 border-y border-green-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Plant size={28} className="text-green-700 flex-shrink-0" weight="duotone" />
            <h2 className="font-heading text-xl sm:text-3xl font-bold text-green-900">
              Diversity is resilience
            </h2>
          </div>
          <p className="mt-4 sm:mt-6 text-gray-700 text-base sm:text-lg leading-relaxed">
            A community where 90% of workers are in one industry looks stable
            &mdash; right up until that industry contracts. Then everything fails
            at once.
          </p>
          <p className="mt-4 text-gray-700 text-base sm:text-lg leading-relaxed">
            We measure not just how much of something a community has, but
            how diversified those holdings are. Moderate employment across five
            sectors is more resilient than high employment concentrated in one.
            The same applies to transport options and land use.
          </p>
          <p className="mt-4 text-gray-600 text-sm sm:text-base leading-relaxed">
            Communities with concentrated dependencies face higher urgency in
            their action recommendations, because when the dominant system fails
            there is no fallback.
          </p>
        </div>
      </section>

      {/* Three paths */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          <Link
            href="/your-place"
            className="block border-2 border-green-200 hover:border-green-400 rounded-xl p-5 sm:p-6 bg-white/80 group cursor-pointer card-hover focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3 text-green-700">
              <MapPin size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
              Your Place
            </p>
            <h3 className="font-heading text-lg font-bold text-gray-900 group-hover:text-green-800 transition-colors">
              Check your community
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Enter your postcode. See your exposure profile, the signals that
              matter most for your area, and the top actions to take.
            </p>
          </Link>
          <Link
            href="/signals"
            className="block border-2 border-amber-200 hover:border-amber-400 rounded-xl p-5 sm:p-6 bg-white/80 group cursor-pointer card-hover focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3 text-amber-700">
              <Target size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Live Signals
            </p>
            <h3 className="font-heading text-lg font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
              Follow the cascade
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Oil prices, fuel stocks, wholesale costs, pump prices, station
              outages. Live data showing where pressure is building right now.
            </p>
          </Link>
          <Link
            href="/guide"
            className="block border-2 border-green-200 hover:border-green-400 rounded-xl p-5 sm:p-6 bg-white/80 group cursor-pointer card-hover focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3 text-green-700">
              <HandHeart size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
              Take Action
            </p>
            <h3 className="font-heading text-lg font-bold text-gray-900 group-hover:text-green-800 transition-colors">
              Organise your community
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              A practical guide for running community circles, mapping local
              resources, and building mutual support that outlasts any single crisis.
            </p>
          </Link>
        </div>
      </section>

      {/* From understanding to action */}
      <section className="bg-green-900 bg-topo text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex items-center gap-8">
          <ScrollReveal direction="left" delay={200} className="hidden md:block flex-shrink-0 opacity-85">
            <Image src="/peeps/standing-1.svg" alt="" width={100} height={240} aria-hidden="true" />
          </ScrollReveal>
          <div className="flex-1 text-center">
          <h2 className="font-heading text-xl sm:text-3xl font-bold">
            From understanding to action
          </h2>
          <p className="mt-6 text-green-100 text-lg leading-relaxed">
            Knowing your community&apos;s exposure is the starting point.
            What matters is what you do with it. The strongest communities
            are the ones where people know each other, trust each other,
            and can coordinate when it counts.
          </p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 mt-8 bg-amber-500 hover:bg-amber-600 text-green-900 font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-green-900"
          >
            <HandHeart size={20} weight="bold" />
            Community Resilience Guide
            <ArrowRight size={16} weight="bold" />
          </Link>
          </div>
          <ScrollReveal direction="right" delay={200} className="hidden md:block flex-shrink-0 opacity-85">
            <Image src="/peeps/standing-12.svg" alt="" width={100} height={240} aria-hidden="true" />
          </ScrollReveal>
        </div>
      </section>

      {/* How it's built */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-green-900 mb-6 sm:mb-8">
          Built in the open
        </h2>
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-8">
          <Principle
            icon={<Database size={22} weight="duotone" className="text-green-700" />}
            title="Official data"
            description="ABS Census, SEIFA, Modified Monash Model, Clean Energy Regulator, state fuel price feeds. Every data source is named and dated."
          />
          <Principle
            icon={<BookOpen size={22} weight="duotone" className="text-green-700" />}
            title="Transparent rules"
            description="Exposure weights are algorithmic, not machine-learned. Every mapping rule is documented. No black boxes."
          />
          <Principle
            icon={<Scales size={22} weight="duotone" className="text-green-700" />}
            title="Honest about gaps"
            description="We show what data is available and name what is missing. Most structural data is from the 2021 Census. We say so."
          />
          <Principle
            icon={<Target size={22} weight="duotone" className="text-green-700" />}
            title="Action-oriented"
            description="Every profile connects to things a person or community can do. Structural factors are not predictions — they're starting points for conversation."
          />
        </div>
      </section>
    </div>
  );
}

function Principle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-heading font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
