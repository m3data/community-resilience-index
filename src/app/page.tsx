import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Resilience Index — Australia",
  description:
    "Postcode-level resilience intelligence for Australian communities. Structural capacity, crisis exposure, and what you can do about it.",
  openGraph: {
    title: "Community Resilience Index — Australia",
    description:
      "How resilient is your community? See your postcode's structural capacity and crisis exposure.",
  },
};
import Image from "next/image";
import { ScrollReveal } from "@/app/components/ui";
import {
  ShieldCheck,
  Lightning,
  MapPin,
  Pulse,
  HandHeart,
  TreeStructure,
  Plant,
  Database,
  BookOpen,
  Scales,
  Target,
  ArrowRight,
  UsersThree,
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
            <h1 className="font-heading text-4xl sm:text-5xl font-bold leading-tight animate-fade-up delay-100">
              How resilient is your community?
            </h1>
            <p className="mt-6 text-lg text-green-100 max-w-2xl leading-relaxed">
              The Community Resilience Index measures structural capacity and crisis
              exposure for every Australian postcode. Official data. Peer-reviewed
              methods. Built for people who want to know what they&apos;re actually
              dealing with.
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

      {/* Two layers */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-heading text-2xl font-bold text-green-900 mb-3">
          Two questions, not one number
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mb-10">
          Most resilience tools produce a single score. The trouble is that a
          low score on infrastructure and a high score on crisis exposure call
          for completely different responses. Collapsing them loses the signal.
        </p>
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="border-2 border-green-200 rounded-xl p-6 bg-white">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <ShieldCheck size={24} className="text-green-700" weight="duotone" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
              Layer 1: Baseline Resilience
            </p>
            <h3 className="font-heading text-lg font-bold text-gray-900">
              How strong is your community&apos;s foundation?
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Social networks, economic diversity, housing, infrastructure,
              community organisations. The structural capacity that exists before
              any crisis hits. Measured across six capitals using the BRIC
              framework &mdash; the most replicated method for community resilience
              measurement globally.
            </p>
            <p className="mt-3 text-xs text-gray-400">Score range: 0&ndash;6</p>
          </div>
          <div className="border-2 border-amber-200 rounded-xl p-6 bg-white">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
              <Lightning size={24} className="text-amber-700" weight="duotone" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Layer 2: Crisis Pressure
            </p>
            <h3 className="font-heading text-lg font-bold text-gray-900">
              How hard is the current situation hitting your area?
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Remoteness, fuel dependency, cost-of-living exposure, transport
              options, energy independence. The specific pressures your community
              faces right now. Adapted from the INFORM framework used by the
              European Commission for humanitarian risk assessment.
            </p>
            <p className="mt-3 text-xs text-gray-400">Score range: 0&ndash;10</p>
          </div>
        </div>
      </section>

      {/* Coherence vs entrainment */}
      <section className="bg-green-50 border-y border-green-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <Plant size={32} className="text-green-700" weight="duotone" />
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-green-900">
              Diversity is resilience
            </h2>
          </div>
          <p className="mt-6 text-gray-700 text-lg leading-relaxed">
            A community where 90% of workers are in one industry looks stable
            &mdash; right up until that industry contracts. Then everything fails
            at once. Standard indices miss this because they measure volume, not
            diversity.
          </p>
          <p className="mt-4 text-gray-700 text-lg leading-relaxed">
            This index measures both. A community with moderate employment across
            five sectors is scored as more resilient than one with high employment
            concentrated in a single sector. The same logic applies to transport
            options, community organisations, and land use.
          </p>
          <p className="mt-4 text-gray-600 text-base leading-relaxed">
            We call this the difference between <strong>coherence</strong> (diverse
            connections that can reorganise under stress) and <strong>entrainment</strong> (locked
            dependencies that fail together).
          </p>
        </div>
      </section>

      {/* Three paths */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-8">
          <Card
            href="/your-place"
            icon={<MapPin size={24} weight="duotone" />}
            label="Your Place"
            title="Check your community"
            description="Enter your postcode. See your resilience score, crisis exposure, and what's driving each number. Every score decomposes to the indicator level."
            color="green"
          />
          <Card
            href="/signals"
            icon={<Pulse size={24} weight="duotone" />}
            label="Signals"
            title="Live situation data"
            description="Fuel reserves, diesel prices, food costs, and media attention. Updated from public sources. Contextual intelligence for your community."
            color="amber"
          />
          <Card
            href="/guide"
            icon={<HandHeart size={24} weight="duotone" />}
            label="Take Action"
            title="Organise your community"
            description="A practical guide for running community circles, mapping local resources, and building mutual aid networks that outlast any single crisis."
            color="green"
          />
        </div>
      </section>

      {/* From understanding to action */}
      <section className="bg-green-900 bg-topo text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 flex items-center gap-8">
          <ScrollReveal direction="left" delay={200} className="hidden md:block flex-shrink-0 opacity-85">
            <Image src="/peeps/standing-1.svg" alt="" width={100} height={240} aria-hidden="true" />
          </ScrollReveal>
          <div className="flex-1 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold">
            From understanding to action
          </h2>
          <p className="mt-6 text-green-100 text-lg leading-relaxed">
            Knowing your community&apos;s resilience score is the starting
            point. What matters is what you do with it. The strongest
            communities are the ones where people know each other, trust each
            other, and can coordinate when it counts.
          </p>
          <p className="mt-4 text-green-100 text-lg leading-relaxed">
            Schools, community halls, local networks — the infrastructure is
            already there in most postcodes. The question is whether it&apos;s
            been tested yet.
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
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-heading text-2xl font-bold text-green-900 mb-8">
          Built in the open
        </h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <Principle
            icon={<Database size={22} weight="duotone" className="text-green-700" />}
            title="Official data"
            description="ABS Census, SEIFA, Modified Monash Model, Clean Energy Regulator, state fuel price feeds. Every data source is named. Every indicator is documented."
          />
          <Principle
            icon={<BookOpen size={22} weight="duotone" className="text-green-700" />}
            title="Peer-reviewed methods"
            description="BRIC (Cutter et al. 2010, 30+ replications), INFORM (JRC European Commission), OECD 10-step quality framework. Not invented here &mdash; adapted and extended."
          />
          <Principle
            icon={<Scales size={22} weight="duotone" className="text-green-700" />}
            title="Transparent methodology"
            description="Full indicator catalogue, weighting rationale, validation results, and sensitivity analysis. See exactly how scores are calculated and where the data has gaps."
          />
          <Principle
            icon={<Target size={22} weight="duotone" className="text-green-700" />}
            title="Action-oriented"
            description="Scores are structural factors, not predictions. Every result connects to something a person or community can do."
          />
        </div>
      </section>
    </div>
  );
}

function Card({
  href,
  icon,
  label,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  color: "amber" | "green";
}) {
  const labelColor =
    color === "amber" ? "text-amber-700" : "text-green-700";
  const borderColor =
    color === "amber"
      ? "border-amber-200 hover:border-amber-400"
      : "border-green-200 hover:border-green-400";
  const iconBg =
    color === "amber" ? "bg-amber-100" : "bg-green-100";

  return (
    <Link
      href={href}
      className={`block border-2 ${borderColor} rounded-xl p-6 bg-white/80 group cursor-pointer card-hover focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2`}
    >
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center mb-3 ${labelColor}`}>
        {icon}
      </div>
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${labelColor} mb-2`}
      >
        {label}
      </p>
      <h3 className="font-heading text-lg font-bold text-gray-900 group-hover:text-green-800 transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        {description}
      </p>
    </Link>
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
