import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/app/components/ui";
import {
  MapPin,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { CircleRound } from "./components/CircleRound";
import { MapCategory } from "./components/MapCategory";
import { System } from "./components/System";
import { Tip } from "./components/Tip";

export const metadata: Metadata = {
  title: "Community Resilience Guide",
  description:
    "A practical guide for schools and communities: how to gather, organise, and build lasting resilience — whatever the pressure.",
};

export default function GuidePage() {
  return (
    <div>
      {/* Hero — recognition moment */}
      <section className="bg-green-900 bg-topo text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight animate-fade-up">
            Your community already has what it needs.
          </h1>
          <div className="mt-8 text-green-100 text-lg leading-relaxed space-y-4">
            <p>
              You know that feeling. Something shifts — prices climb, shelves
              thin out, the news gets heavier — and a quiet worry settles in
              your chest. You start doing arithmetic you never used to do. You
              notice your neighbours looking a bit more tired.
            </p>
            <p>
              Here&apos;s what most people don&apos;t realise in those moments:
              the person across the street is doing the same arithmetic. The
              parent next to you at school pickup is carrying the same worry.
              And between all of you, there are skills, resources,
              relationships, and knowledge that — if they were visible and
              connected — would change everything.
            </p>
            <p className="text-white font-medium">
              This guide is about making those things visible and connected.
            </p>
          </div>
        </div>
      </section>

      {/* Evergreen framing */}
      <section className="bg-green-50 border-b border-green-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-green-800 text-sm leading-relaxed">
            It works whether the pressure is fuel prices, food costs, floods,
            drought, or just the slow grind of life getting harder. The steps
            are the same because the foundation is the same: people who know
            each other, trust each other, and can coordinate when it matters.
            You don&apos;t need special training. You don&apos;t need
            permission. You need a room, a circle of chairs, and the
            willingness to ask honest questions.
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Phase overview */}
        <div className="mb-16">
          <h2 className="font-heading text-2xl font-bold text-green-900 mb-6">
            Three phases. Start wherever you are.
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <ScrollReveal delay={0}>
              <PhaseCard
                number={1}
                title="Gather"
                description="Bring people together. Share what's real. Discover what your community already has."
                peep="/peeps/sitting-7.svg"
              />
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <PhaseCard
                number={2}
                title="Organise"
                description="Turn what you learned into practical systems that help people now."
                peep="/peeps/standing-10.svg"
              />
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <PhaseCard
                number={3}
                title="Build"
                description="Create lasting infrastructure. The pressure that brought you together won't be the last one."
                peep="/peeps/standing-3.svg"
              />
            </ScrollReveal>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Each phase builds on the last. Most communities can move through
            Phase 1 in a single week. Some will stay in Phase 2 for months.
            Others will leap into Phase 3 within weeks. There&apos;s no right
            speed. There&apos;s only starting.
          </p>
        </div>

        {/* ── PHASE 1: GATHER ── */}
        <PhaseHeading number={1} title="Gather" />

        <StoryFragment>
          It started with a message in the school WhatsApp group. &ldquo;Anyone
          else worried about what&apos;s happening? I&apos;m thinking of
          organising a get-together at the school to talk about it. Nothing
          fancy — just tea and honest conversation.&rdquo; Thirty-two people
          showed up. Most of them had never spoken to each other beyond hello at
          the gate.
        </StoryFragment>

        <h3 className="font-heading text-xl font-bold text-gray-900 mt-10 mb-4">
          What you do
        </h3>
        <p className="text-gray-700 leading-relaxed">
          Pick a date in the next seven days. Book a space at your school — the
          hall, the library, a large classroom. Send a simple message through
          whatever channels your school community already uses: class parent
          groups, the school app, the P&amp;C email list, a notice at the front
          office.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 my-6">
          <p className="text-gray-600 text-sm italic">
            &ldquo;We&apos;re holding a community gathering to talk about how
            we can support each other. Everyone welcome. [Date, time,
            place].&rdquo;
          </p>
        </div>

        <p className="text-gray-700 leading-relaxed">
          Set up the room with chairs in a circle. No tables between people.
          Arrange tea, coffee, and something simple to share. This matters more
          than you think.
        </p>

        <h3 className="font-heading text-xl font-bold text-gray-900 mt-10 mb-4">
          The conversation (90 minutes)
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          You&apos;ll need one person to hold the space (that might be you), a
          large sheet of paper or whiteboard, markers, and sticky notes.
        </p>

        <div className="space-y-6">
          <CircleRound
            name="Open together"
            time="10 min"
            description="Welcome everyone. Acknowledge that people are here because something real is happening and they care. Ask everyone to take three slow breaths together. Set three agreements: listen with respect, speak from your own experience, what's shared here stays here."
          />
          <CircleRound
            name="Round 1 — How are you going?"
            time="20 min"
            description="Go around the circle. Each person gets a minute to answer honestly. No advice, no fixing — just listening. This is where people discover they're not alone in what they're feeling."
          />
          <CircleRound
            name="Round 2 — What do you have?"
            time="20 min"
            description="Same format, different question. 'What resources, skills, or capacity do you have that could help others?' A veggie garden. A trailer. Mechanical skills. A chest freezer with space. Experience preserving food. Connections to local farmers. First aid training. Write each one on a sticky note and put it on the wall."
          />
          <CircleRound
            name="Round 3 — What do you need?"
            time="20 min"
            description="'What are you worried about, or what do you need help with?' Transport. Affordable food. Medication access. Childcare. Help with elderly parents. Sticky notes on the wall."
          />
          <CircleRound
            name="Match and act"
            time="15 min"
            description="Look at the wall together. Where do the 'haves' meet the 'needs'? Let people find each other and make arrangements directly. You'll be surprised how fast connections form when offers and needs are visible."
          />
          <CircleRound
            name="Close"
            time="5 min"
            description="Thank everyone. Set the date for next week. Ask for three to five volunteers to form a small coordination group. Collect contact details from anyone willing to stay connected. Three breaths together."
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-8">
          <h4 className="font-heading font-semibold text-amber-800 mb-2">
            Why this sequence matters
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            This isn&apos;t a meeting — it&apos;s a different kind of
            conversation. The order matters: first we acknowledge what&apos;s
            real (feelings), then we discover what we have (capacity), then we
            name what&apos;s missing (needs), then we connect what&apos;s there
            to what&apos;s needed (action). Skipping straight to action without
            the first two rounds produces arrangements that are brittle and
            transactional. Starting with honesty produces relationships that
            hold up under pressure.
          </p>
        </div>

        {/* ── PHASE 2: ORGANISE ── */}
        <PhaseHeading number={2} title="Organise" />

        <StoryFragment>
          By the second week, the sticky notes had been sorted into a
          spreadsheet. Someone made a group chat for the transport roster. A
          retired teacher offered to coordinate a bulk-buying group. The school
          canteen manager said they could store dry goods if people wanted to
          pool orders. It wasn&apos;t a plan anyone designed — it grew from what
          people offered.
        </StoryFragment>

        <h3 className="font-heading text-xl font-bold text-gray-900 mt-10 mb-4">
          Turn your resource map into practical systems
        </h3>
        <p className="text-gray-700 leading-relaxed mb-6">
          After the first gathering, your coordination group takes the
          information that surfaced and organises it. This can be a shared
          document, a spreadsheet, or butcher&apos;s paper on the school
          noticeboard. Sort what you know into five areas:
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <MapCategory
            title="Food"
            items="Who grows food? Who has surplus? Where are nearby farms selling direct? Who knows how to preserve, batch cook, or store food well? Could the school host a food-sharing table or a weekly farm-gate pickup?"
          />
          <MapCategory
            title="Transport"
            items="Who drives similar routes and could share? Who has vehicles for moving cargo? What essential journeys could be combined or eliminated? Could a simple group chat let people post trips and available seats?"
          />
          <MapCategory
            title="Skills"
            items="Mechanical, medical, building, cooking, childcare, teaching, administration, counselling, IT. Every community has more depth than it realises. A simple skills directory makes it findable."
          />
          <MapCategory
            title="Spaces"
            items="The school itself. Community halls. Church buildings. Sports clubs. Private properties with sheds, productive land, or workshop space. What's available and how do people access it?"
          />
          <MapCategory
            title="People who need reaching"
            items="Who in the community is isolated, elderly, unwell, or without transport? Divide the school catchment into zones and assign a volunteer contact for each who checks in weekly. A phone call. A knock on the door."
            className="sm:col-span-2"
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-8">
          <p className="text-gray-700 text-sm leading-relaxed">
            <strong>Keep it simple.</strong> You don&apos;t need an app, a
            website, or a formal structure. Group chats, printed lists, and word
            of mouth are fine. The goal is speed and accessibility — especially
            for people who aren&apos;t confident with technology. If a
            spreadsheet helps, use one. If a noticeboard works better, use that.
          </p>
          <p className="text-gray-700 text-sm leading-relaxed mt-3">
            The weekly gathering continues. Each week you report back, adjust,
            and deepen. The rhythm of meeting regularly is what builds the trust
            that everything else depends on.
          </p>
        </div>

        {/* ── PHASE 3: BUILD ── */}
        <PhaseHeading number={3} title="Build" />

        <StoryFragment>
          Three months later, the school had six raised garden beds where there
          used to be an unused strip of lawn. A fortnightly farm box pickup ran
          out of the car park. Someone&apos;s uncle who runs a mechanic shop
          offered free basic car checks for anyone in the network. Two families
          started a seed library in the school library. None of it was in
          anyone&apos;s original plan. All of it grew from relationships that
          formed in those first circles.
        </StoryFragment>

        <h3 className="font-heading text-xl font-bold text-gray-900 mt-10 mb-4">
          Create infrastructure that outlasts the pressure
        </h3>
        <p className="text-gray-700 leading-relaxed mb-6">
          At some point — it might be three weeks in, it might be three months —
          the conversations will shift. The immediate pressure eases or becomes
          familiar, and a different question surfaces: what do we want to build
          that lasts?
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          This is when what you built under pressure starts to become something
          you&apos;d want anyway. The possibilities depend on your context, but
          patterns show up everywhere:
        </p>

        <div className="space-y-4">
          <System
            title="Community garden"
            description="Many schools already have garden beds. Expand them. Involve parents, students, and neighbours. Grow food that people actually eat, alongside educational plantings. This builds food resilience, soil health, and intergenerational relationships at the same time."
          />
          <System
            title="Local food network"
            description="Connect directly with nearby farmers and growers. Set up a regular pickup at the school. Shorten the supply chain from thousands of kilometres to tens. This is more resilient, often cheaper, and the food is better."
          />
          <System
            title="Skills exchange"
            description="Run regular workshops at the school: food preserving, basic repair, mending, cooking from staples, first aid, seed saving, solar basics. Every skill shared is a piece of community independence."
          />
          <System
            title="Shared resources"
            description="Tool libraries, bulk-buying cooperatives, shared workshop space, community-owned equipment. Pooling resources reduces costs and builds interdependence."
          />
          <System
            title="Energy and transport"
            description="Begin collective conversations about solar, batteries, EV charging, bike infrastructure, and local fuel alternatives. These are longer-term projects. The planning starts now while the motivation is high and the relationships are warm."
          />
        </div>

        <h3 className="font-heading text-xl font-bold text-gray-900 mt-10 mb-4">
          Connect with neighbouring communities
        </h3>
        <p className="text-gray-700 leading-relaxed">
          Your school isn&apos;t the only one doing this. As circles form at
          schools across your area, a network emerges naturally. Different
          communities have different strengths — one might have strong farm
          connections, another might have trade skills, another a large hall for
          distribution. Linking up multiplies what everyone has access to.
        </p>
        <p className="text-gray-700 leading-relaxed mt-4">
          Reach out to your local council too. Bring your resource map and your
          track record. Show what&apos;s working. Ask where they can help.
        </p>

        {/* Tips */}
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="font-heading text-2xl font-bold text-green-900 mb-8">
            Tips for whoever holds the space
          </h2>
          <div className="space-y-6">
            <Tip
              title="You don't need to be an expert"
              text="The most important quality is willingness to listen more than you talk, keep time gently, and make sure quieter voices get heard. The group has its own wisdom. Your job is to create conditions where it surfaces."
            />
            <Tip
              title="Handle strong emotions with care"
              text="People may cry, get angry, or feel scared. This is appropriate — it means they feel safe enough to be honest. Don't try to fix it. Acknowledge it, let a moment of silence hold it, and move on."
            />
            <Tip
              title="Watch for the helpers"
              text="In every group, certain people naturally step into action. Notice them, thank them, and check in with them between gatherings. They're the emerging backbone of your network, and they need support too."
            />
            <Tip
              title="Keep the rhythm"
              text="Weekly for the first month, then fortnightly. Regularity matters more than duration. People need to know the next gathering is happening and that it will happen."
            />
            <Tip
              title="Include young people"
              text="They're affected by this too. They have energy, creativity, and a stake in what gets built. Involve them in the garden, the food share, the mapping, the making. Young people who experience community self-organisation during a formative moment carry that capacity for life."
            />
          </div>
        </div>

        {/* Closing */}
        <div className="mt-16 bg-green-900 text-white rounded-xl p-8 sm:p-10">
          <h2 className="font-heading text-2xl font-bold mb-4">
            Start this week.
          </h2>
          <p className="text-lg leading-relaxed text-green-100">
            Every community that has ever come together to look after itself
            started the same way: one person decided to gather the others.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-white font-medium">
            That person might be you.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-green-100">
            Book the room. Send the message. Set up the chairs. Trust that your
            neighbours will come, because they&apos;re waiting for someone to
            take the first step.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/your-place"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-green-900 font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-green-900"
            >
              <MapPin size={20} weight="bold" />
              Check your community&apos;s resilience score
            </Link>
            <a
              href="https://collectivefuturecrafting.net"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-green-900"
            >
              Start a circle
              <ArrowRight size={16} weight="bold" />
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          This guide is part of the{" "}
          <a
            href="https://collectivefuturecrafting.net"
            className="text-green-700 hover:underline"
            target="_blank"
            rel="noopener"
          >
            Collective Futurecrafting
          </a>{" "}
          project. Freely available for use, adaptation, and sharing.
        </p>
      </article>
    </div>
  );
}

// ── Page-level components ──────────────────────────────────────

function PhaseCard({
  number,
  title,
  description,
  peep,
}: {
  number: number;
  title: string;
  description: string;
  peep?: string;
}) {
  return (
    <div className="border border-green-200 rounded-xl p-5 bg-white/80 card-hover relative overflow-hidden">
      {peep && (
        <div className="absolute -bottom-2 -right-2 opacity-10">
          <Image src={peep} alt="" width={80} height={140} aria-hidden="true" />
        </div>
      )}
      <div className="relative">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-800 text-white font-heading font-bold text-sm mb-3">
          {number}
        </span>
        <h3 className="font-heading font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function PhaseHeading({
  number,
  title,
}: {
  number: number;
  title: string;
}) {
  return (
    <div className="mt-16 mb-6 flex items-center gap-4 border-b-2 border-green-200 pb-3">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-800 text-white font-heading font-bold text-sm">
        {number}
      </span>
      <h2 className="font-heading text-2xl font-bold text-green-900">
        {title}
      </h2>
    </div>
  );
}

function StoryFragment({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-green-50 border-l-4 border-green-300 rounded-r-lg px-6 py-5 my-8">
      <p className="text-gray-700 italic leading-relaxed">{children}</p>
    </div>
  );
}
