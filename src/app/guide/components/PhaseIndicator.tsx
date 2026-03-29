"use client";

import { useEffect, useState, useCallback } from "react";

const PHASES = [
  { id: "gather", number: 1, label: "Gather" },
  { id: "organise", number: 2, label: "Organise" },
  { id: "build", number: 3, label: "Build" },
] as const;

export function PhaseIndicator() {
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const phaseEls = PHASES.map((p) => document.getElementById(p.id)).filter(
      Boolean
    ) as HTMLElement[];
    const heroEl = document.getElementById("guide-hero");
    const ctaEl = document.getElementById("guide-cta");

    if (phaseEls.length === 0) return;

    // Track which phase is active based on scroll position
    const phaseObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActivePhase(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    for (const el of phaseEls) {
      phaseObserver.observe(el);
    }

    // Track visibility — hide in hero and CTA
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const heroVisible = entries.find(
          (e) => e.target.id === "guide-hero"
        )?.isIntersecting;
        const ctaVisible = entries.find(
          (e) => e.target.id === "guide-cta"
        )?.isIntersecting;

        if (heroVisible || ctaVisible) {
          setVisible(false);
        } else {
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (heroEl) visibilityObserver.observe(heroEl);
    if (ctaEl) visibilityObserver.observe(ctaEl);

    return () => {
      phaseObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  const handleJump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const activeIdx = PHASES.findIndex((p) => p.id === activePhase);

  return (
    <>
      {/* Desktop rail — left edge, visible ≥1024px */}
      <div
        className={`hidden lg:flex fixed left-4 xl:left-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Guide phases"
        role="navigation"
      >
        {PHASES.map((phase, idx) => {
          const isActive = phase.id === activePhase;
          const isPast = activeIdx > idx;

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => handleJump(phase.id)}
              className="group flex flex-col items-center py-2"
              aria-label={`Jump to Phase ${phase.number}: ${phase.label}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`text-[10px] font-heading font-semibold transition-colors ${
                  isActive
                    ? "text-amber-600"
                    : isPast
                      ? "text-green-700"
                      : "text-gray-600"
                }`}
              >
                {phase.number}
              </span>
              <span
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  isActive
                    ? "bg-amber-500 border-amber-500 scale-110"
                    : isPast
                      ? "bg-green-600 border-green-600 scale-90"
                      : "bg-transparent border-gray-400 group-hover:border-gray-500"
                }`}
              />
              {idx < PHASES.length - 1 && (
                <span
                  className={`w-px h-6 transition-colors ${
                    isPast ? "bg-green-400/40" : "bg-gray-200"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile band — bottom fixed, visible <1024px */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F5F0E6]/95 backdrop-blur-sm border-t border-gray-200 transition-all duration-200 ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        aria-label="Guide phases"
        role="navigation"
      >
        <div className="flex h-11">
          {PHASES.map((phase) => {
            const isActive = phase.id === activePhase;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => handleJump(phase.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors relative ${
                  isActive ? "text-amber-700" : "text-gray-600"
                }`}
                aria-label={`Jump to Phase ${phase.number}: ${phase.label}`}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="font-heading">{phase.number}</span>
                <span>{phase.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
