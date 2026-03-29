"use client";

import { useState } from "react";
import { Timer, CaretDown } from "@phosphor-icons/react";

export function CircleConversation({ rounds }: { rounds: RoundProps[] }) {
  const [openIdx, setOpenIdx] = useState(0);
  const totalTime = rounds.reduce((sum, r) => sum + r.minutes, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Timer size={16} weight="duotone" className="text-green-700" />
          <span>{totalTime} minutes total</span>
        </div>
        <button
          type="button"
          onClick={() => setOpenIdx(-1)}
          className="text-xs text-gray-600 hover:text-gray-800 underline underline-offset-2"
        >
          Collapse all
        </button>
      </div>
      <div className="space-y-3">
        {rounds.map((round, idx) => (
          <RoundCard
            key={idx}
            {...round}
            step={idx + 1}
            total={rounds.length}
            isOpen={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)}
            onNext={idx < rounds.length - 1 ? () => setOpenIdx(idx + 1) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface RoundProps {
  name: string;
  minutes: number;
  description: string;
  prompt?: string;
}

function RoundCard({
  name,
  minutes,
  description,
  prompt,
  step,
  total,
  isOpen,
  onToggle,
  onNext,
}: RoundProps & {
  step: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
  onNext?: () => void;
}) {
  return (
    <div
      className={`rounded-xl border transition-all ${
        isOpen
          ? "border-green-300 bg-white shadow-sm"
          : "border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3"
        aria-expanded={isOpen}
      >
        {/* Step number */}
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
            isOpen
              ? "bg-green-800 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {step}
        </span>

        {/* Title + time */}
        <div className="flex-1 min-w-0">
          <span className={`font-heading font-semibold text-sm sm:text-base ${isOpen ? "text-green-900" : "text-gray-700"}`}>
            {name}
          </span>
        </div>

        {/* Time badge */}
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
          {minutes} min
        </span>

        {/* Expand icon */}
        <CaretDown
          size={16}
          weight="bold"
          className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          {/* Prompt callout — the actual question to ask the group */}
          {prompt && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3">
              <p className="text-green-900 font-medium text-sm italic">
                &ldquo;{prompt}&rdquo;
              </p>
            </div>
          )}

          <p className="text-sm text-gray-700 leading-relaxed">
            {description}
          </p>

          {/* Next step button */}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="mt-3 text-xs font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
            >
              Next: Step {step + 1}
              <CaretDown size={12} weight="bold" className="-rotate-90" />
            </button>
          )}

          {/* Progress bar */}
          <div className="mt-3 flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < step ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Keep backward compat for any other usage
export function CircleRound({
  name,
  time,
  description,
  step,
}: {
  name: string;
  time: string;
  description: string;
  step?: number;
}) {
  return (
    <div className="border-l-3 border-green-300 pl-4 sm:pl-5">
      <div className="flex items-baseline gap-2 mb-1">
        {step && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs font-bold flex-shrink-0">
            {step}
          </span>
        )}
        <h4 className="font-heading font-semibold text-gray-900">{name}</h4>
        <span className="text-sm text-gray-600 font-mono">{time}</span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
