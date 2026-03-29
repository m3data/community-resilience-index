import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/app/components/ui";
import {
  MapPin,
  ArrowRight,
  ArrowDown,
} from "@phosphor-icons/react/dist/ssr";
import { PhaseIndicator } from "./components/PhaseIndicator";
import { CircleConversation } from "./components/CircleRound";
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
      <PhaseIndicator />

      {/* Hero — recognition moment */}
      <section id="guide-hero" className="bg-green-900 bg-topo text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24">
          <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight animate-fade-up">
            Your community already has what it needs.
          </h1>
          <div className="mt-6 sm:mt-8 text-green-100 text-base sm:text-lg leading-relaxed space-y-4">
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

          {/* Skip affordance for returning visitors */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-green-200 text-sm">
              Already done Phase 1?{" "}
              <a href="#organise" className="text-green-200 underline underline-offset-2 hover:text-white">
                Jump to Organise
              </a>{" "}
              or{" "}
              <a href="#build" className="text-green-200 underline underline-offset-2 hover:text-white">
                Build
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Broadened framing */}
      <section className="bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <p className="text-green-800 text-sm leading-relaxed">
            This guide uses a school as the starting point because schools are
            where most communities already gather. But the same approach works
            from a church hall, a sports club, a community centre, or your
            neighbour&apos;s back verandah. Wherever people already know each
            other&apos;s names is a good place to start. Even a conversation
            across the fence counts.
          </p>
        </div>
      </section>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-16 lg:pb-8">
        {/* Phase overview */}
        <div className="mb-12 sm:mb-16">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-green-900 mb-6">
            Three phases. Start wherever you are.
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            <ScrollReveal delay={0}>
              <PhaseCard
                number={1}
                title="Gather"
                description="Bring people together. Share what's real. Discover what your community already has."
                peep="/peeps/sitting-7.svg"
                href="#gather"
              />
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <PhaseCard
                number={2}
                title="Organise"
                description="Turn what you learned into practical systems that help people now."
                peep="/peeps/standing-10.svg"
                href="#organise"
              />
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <PhaseCard
                number={3}
                title="Build"
                description="Create lasting infrastructure. The pressure that brought you together won't be the last one."
                peep="/peeps/standing-3.svg"
                href="#build"
              />
            </ScrollReveal>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            Each phase builds on the last. Most communities can move through
            Phase 1 in a single week. Some will stay in Phase 2 for months.
            Others will leap into Phase 3 within weeks. There&apos;s no right
            speed. There&apos;s only starting.
          </p>
        </div>

        {/* ── PHASE 1: GATHER ── */}
        <section id="gather" className="guide-phase-section">
          <PhaseHeading number={1} title="Gather" subtitle="Bring people together and discover what your community already has." />

          <StoryFragment first>
            It started with a message in the school WhatsApp group. &ldquo;Anyone
            else worried about what&apos;s happening? I&apos;m thinking of
            organising a get-together at the school to talk about it. Nothing
            fancy — just tea and honest conversation.&rdquo; Thirty-two people
            showed up. Most of them had never spoken to each other beyond hello at
            the gate.
          </StoryFragment>

          <div id="first-gathering" className="guide-anchor-section">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 mt-8 sm:mt-10 mb-4">
              Your first gathering
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Pick a date in the next seven days. Book a space — the school hall,
              a church, a community centre, a large lounge room. Send a simple
              message through whatever channels your community already uses: class
              parent groups, the local Facebook page, a notice at the front office,
              word of mouth.
            </p>

            <div className="bg-white border border-green-200 rounded-xl p-5 my-6 relative">
              <div className="absolute -top-2 left-4 bg-white px-2">
                <span className="text-xs font-heading font-semibold text-green-600 uppercase tracking-wider">
                  Copy and send
                </span>
              </div>
              <p className="text-gray-800 text-sm italic leading-relaxed mt-1">
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
          </div>

          <div id="circle-conversation" className="guide-anchor-section">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 mt-8 sm:mt-10 mb-4">
              The circle conversation (90 minutes)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              A structured format for honest community conversation. You&apos;ll
              need one person to hold the space (that might be you), a large sheet
              of paper or whiteboard, markers, and sticky notes.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              The times below are a guide, not a script. Some rounds will run
              long. That&apos;s fine. Allow about two and a half hours for the
              whole thing: 30 minutes beforehand to set up chairs, get the
              kettle on, put up your paper and sticky notes, and greet people
              as they arrive. Then 90 minutes for the conversation itself.
              Then 30 minutes afterwards for people to chat, swap details, and
              help pack up. Don&apos;t rush the ending — the informal
              conversation after the circle is where a lot of the real
              connecting happens.
            </p>

            <CircleConversation
              rounds={[
                {
                  name: "Open together",
                  minutes: 10,
                  description: "Welcome everyone. Begin by acknowledging the Traditional Custodians of the land you are gathered on and pay respect to Elders past, present, and emerging. Then acknowledge that people are here because something real is happening and they care. Ask everyone to take three slow breaths together. Set three agreements: listen with respect, speak from your own experience, what's shared here stays here.",
                },
                {
                  name: "How are you going?",
                  minutes: 20,
                  prompt: "We'll go around the circle. You have about a minute each. Just tell us honestly — how are you going?",
                  description: "Go around the circle. Each person gets a minute to answer honestly. No advice, no fixing — just listening. This is where people discover they're not alone in what they're feeling.",
                },
                {
                  name: "What do you have?",
                  minutes: 20,
                  prompt: "Same format, different question. What resources, skills, or capacity do you have that could help others?",
                  description: "A veggie garden. A trailer. Mechanical skills. A chest freezer with space. Experience preserving food. Connections to local farmers. First aid training. Write each one on a sticky note and put it on the wall.",
                },
                {
                  name: "What do you need?",
                  minutes: 20,
                  prompt: "What are you worried about, or what do you need help with?",
                  description: "Transport. Affordable food. Medication access. Childcare. Help with elderly parents. Sticky notes on the wall, next to the offers.",
                },
                {
                  name: "Match and act",
                  minutes: 15,
                  description: "Look at the wall together. Where do the offers meet the needs? Let people find each other and make arrangements directly. You'll be surprised how fast connections form when what people have and what people need are visible in the same space.",
                },
                {
                  name: "Close",
                  minutes: 5,
                  description: "Thank everyone. Set the date for next week. Ask for three to five volunteers to form a small coordination group. Collect contact details from anyone willing to stay connected. Three slow breaths together.",
                },
              ]}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sm:p-6 mt-8 relative">
              <div className="absolute -top-2 left-4 bg-amber-50 px-2">
                <span className="text-xs font-heading font-semibold text-amber-600 uppercase tracking-wider">
                  Why this works
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mt-1">
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
          </div>
        </section>

        {/* ── PHASE 2: ORGANISE ── */}
        <section id="organise" className="guide-phase-section">
          <PhaseHeading number={2} title="Organise" subtitle="Turn what you discovered into practical systems that help people now." />

          <StoryFragment>
            By the second week, the sticky notes had been sorted into a
            spreadsheet. Someone made a group chat for the transport roster. A
            retired teacher offered to coordinate a bulk-buying group. The school
            canteen manager said they could store dry goods if people wanted to
            pool orders. It wasn&apos;t a plan anyone designed — it grew from what
            people offered.
          </StoryFragment>

          <div id="resource-map" className="guide-anchor-section">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 mt-8 sm:mt-10 mb-4">
              Turn your resource map into practical systems
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              After the first gathering, your coordination group takes the
              information that surfaced and organises it. Sort what you learned
              into five areas:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <MapCategory
                title="Food"
                items="Who grows food? Who has surplus? Where are nearby farms selling direct? Who knows how to preserve, batch cook, or store food well? Could you host a food-sharing table or a weekly farm-gate pickup?"
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
                items="The school, community halls, church buildings, sports clubs. Private properties with sheds, productive land, or workshop space. What's available and how do people access it?"
              />
              <MapCategory
                title="People who need reaching"
                items="Who in the community is isolated, elderly, unwell, or without transport? Divide the area into zones and assign a volunteer contact for each who checks in weekly. A phone call. A knock on the door."
                className="sm:col-span-2"
              />
            </div>
          </div>

          <div id="keeping-it-simple" className="guide-anchor-section">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-6 mt-8 relative">
              <div className="absolute -top-2 left-4 bg-gray-50 px-2">
                <span className="text-xs font-heading font-semibold text-gray-600 uppercase tracking-wider">
                  Keep it simple
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mt-1">
                You don&apos;t need an app, a website, or a formal structure.
                Group chats, printed lists, and word of mouth are fine. The goal is
                speed and accessibility — especially for people who aren&apos;t
                confident with technology. If a spreadsheet helps, use one. If a
                noticeboard works better, use that.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed mt-3">
                The weekly gathering continues. Each week you report back, adjust,
                and deepen. The rhythm of meeting regularly is what builds the trust
                that everything else depends on.
              </p>
            </div>
          </div>
        </section>

        {/* ── PHASE 3: BUILD ── */}
        <section id="build" className="guide-phase-section">
          <PhaseHeading number={3} title="Build" subtitle="Create infrastructure that outlasts the pressure that brought you together." />

          <StoryFragment>
            Three months later, the school had six raised garden beds where there
            used to be an unused strip of lawn. A fortnightly farm box pickup ran
            out of the car park. Someone&apos;s uncle who runs a mechanic shop
            offered free basic car checks for anyone in the network. Two families
            started a seed library in the school library. None of it was in
            anyone&apos;s original plan. All of it grew from relationships that
            formed in those first circles.
          </StoryFragment>

          <div className="guide-anchor-section">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 mt-8 sm:mt-10 mb-4">
              What to build depends on your community
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              At some point the conversations shift. The immediate pressure eases
              or becomes familiar, and a different question surfaces: what do we
              want to build that lasts?
            </p>
            <p className="text-gray-700 leading-relaxed mb-8">
              Patterns show up everywhere. Here are the most common:
            </p>
          </div>

          <div className="space-y-4">
            <div id="community-garden" className="guide-anchor-section">
              <System
                title="Community garden"
                description="Many schools and community spaces already have unused land. Expand it. Involve families, students, and neighbours. Grow food that people actually eat, alongside educational plantings. This builds food resilience, soil health, and intergenerational relationships at the same time."
              />
            </div>
            <div id="food-network" className="guide-anchor-section">
              <System
                title="Local food network"
                description="Connect directly with nearby farmers and growers. Set up a regular pickup at a central location. Shorten the supply chain from thousands of kilometres to tens. This is more resilient, often cheaper, and the food is better."
              />
            </div>
            <div id="skills-exchange" className="guide-anchor-section">
              <System
                title="Skills exchange"
                description="Run regular workshops: food preserving, basic repair, mending, cooking from staples, first aid, seed saving, solar basics. Every skill shared is a piece of community independence."
              />
            </div>
            <div id="shared-resources" className="guide-anchor-section">
              <System
                title="Shared resources"
                description="Tool libraries, bulk-buying cooperatives, shared workshop space, community-owned equipment. Pooling resources reduces costs and builds interdependence."
              />
            </div>
            <div id="energy-transport" className="guide-anchor-section">
              <System
                title="Energy and transport"
                description="Begin collective conversations about solar, batteries, EV charging, bike infrastructure, and local fuel alternatives. These are longer-term projects. The planning starts now while the motivation is high and the relationships are warm."
              />
            </div>
            <div id="fuel-pooling" className="guide-anchor-section">
              <System
                title="Fuel pooling and transport sharing"
                description="Communities with high car dependency can reduce individual fuel costs through coordinated carpooling, shared school runs, and bulk fuel purchasing. A simple roster shared via group chat can cut household fuel spend by 20-30%."
              />
            </div>
          </div>

          <div id="connect-neighbours" className="guide-anchor-section">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 mt-8 sm:mt-10 mb-4">
              Connect with neighbouring communities
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Your community isn&apos;t the only one doing this. As circles form
              across your area, a network emerges naturally. Different communities
              have different strengths — one might have strong farm connections,
              another might have trade skills, another a large hall for
              distribution. Linking up multiplies what everyone has access to.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Reach out to your local council too. Bring your resource map and your
              track record. Show what&apos;s working. Ask where they can help.
            </p>
          </div>
        </section>

        {/* Tips */}
        <section id="facilitator-tips" className="guide-anchor-section mt-12 sm:mt-16 border-t border-gray-200 pt-8 sm:pt-12">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-green-900 mb-6 sm:mb-8">
            Tips for whoever holds the space
          </h2>
          <div className="space-y-3">
            <Tip
              number={1}
              title="You don't need to be an expert"
              text="The most important quality is willingness to listen more than you talk, keep time gently, and make sure quieter voices get heard. The group has its own wisdom. Your job is to create conditions where it surfaces."
            />
            <Tip
              number={2}
              title="Handle strong emotions with care"
              text="People may cry, get angry, or feel scared. This is appropriate — it means they feel safe enough to be honest. Don't try to fix it. Acknowledge it, let a moment of silence hold it, and move on."
            />
            <Tip
              number={3}
              title="Watch for the helpers"
              text="In every group, certain people naturally step into action. Notice them, thank them, and check in with them between gatherings. They're the emerging backbone of your network, and they need support too."
            />
            <Tip
              number={4}
              title="Keep the rhythm"
              text="Weekly for the first month, then fortnightly. Regularity matters more than duration. People need to know the next gathering is happening and that it will happen."
            />
            <Tip
              number={5}
              title="Include young people"
              text="They're affected by this too. They have energy, creativity, and a stake in what gets built. Involve them in the garden, the food share, the mapping, the making. Young people who experience community self-organisation during a formative moment carry that capacity for life."
            />
          </div>
        </section>

        {/* Closing CTA */}
        <section id="guide-cta" className="mt-12 sm:mt-16">
          <div className="bg-green-900 text-white rounded-xl p-6 sm:p-10">
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-4">
              Start this week.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-green-100">
              Every community that has ever come together to look after itself
              started the same way: one person decided to gather the others.
            </p>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-white font-medium">
              That person might be you.
            </p>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-green-100">
              Book the room. Send the message. Set up the chairs. Trust that your
              neighbours will come, because they&apos;re waiting for someone to
              take the first step.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-4">
              <Link
                href="/your-place"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-green-900 font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-green-900"
              >
                <MapPin size={20} weight="bold" />
                Check your community&apos;s exposure profile
              </Link>
              <a
                href="https://collectivefuturecrafting.net"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-900"
              >
                Start a circle
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>
          </div>

          <p className="mt-6 sm:mt-8 text-center text-sm text-gray-600">
            This guide is part of the{" "}
            <a
              href="https://collectivefuturecrafting.net"
              className="text-green-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Collective Futurecrafting
            </a>{" "}
            project. Freely available for use, adaptation, and sharing.
          </p>
        </section>
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
  href,
}: {
  number: number;
  title: string;
  description: string;
  peep?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block border border-green-200 rounded-xl p-5 bg-white/80 card-hover relative overflow-hidden group"
    >
      {peep && (
        <div className="absolute -bottom-2 -right-2 opacity-20">
          <Image src={peep} alt="" width={80} height={140} aria-hidden="true" />
        </div>
      )}
      <div className="relative">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-800 text-white font-heading font-bold text-sm mb-3">
          {number}
        </span>
        <h3 className="font-heading font-bold text-gray-900 group-hover:text-green-800 transition-colors">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </a>
  );
}

function PhaseHeading({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mt-12 sm:mt-16 mb-4 sm:mb-6 border-b-2 border-green-200 pb-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-800 text-white font-heading font-bold text-sm">
          {number}
        </span>
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-green-900">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm sm:text-base text-gray-600 ml-12">
        {subtitle}
      </p>
    </div>
  );
}

function StoryFragment({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className="rounded-xl bg-green-50 border border-green-200 px-5 sm:px-6 py-4 sm:py-5 my-6 sm:my-8 relative">
      <div className="absolute -top-2 left-4 bg-green-50 px-2">
        <span className="text-xs font-heading font-semibold text-green-600 uppercase tracking-wider">
          Story
        </span>
      </div>
      {first && (
        <p className="text-sm text-green-700 mb-3 font-medium">
          Throughout this guide, you&apos;ll follow one community as they work
          through each phase. Their story is fictional but assembled from real
          patterns.
        </p>
      )}
      <p className="text-gray-700 italic leading-relaxed">{children}</p>
    </div>
  );
}
