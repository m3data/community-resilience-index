"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export function ViewToggle({
  dashboardContent,
  cascadeContent,
}: {
  dashboardContent: ReactNode;
  cascadeContent: ReactNode;
}) {
  const [view, setView] = useState<"dashboard" | "cascade">("dashboard");

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <nav
          aria-label="Signal view"
          className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100/80"
        >
          <button
            onClick={() => setView("dashboard")}
            aria-pressed={view === "dashboard"}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "dashboard"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView("cascade")}
            aria-pressed={view === "cascade"}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "cascade"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Cascade flow
          </button>
        </nav>
      </div>
      <div className={view !== "dashboard" ? "hidden" : undefined}>
        {dashboardContent}
      </div>
      <div className={view !== "cascade" ? "hidden" : undefined}>
        {cascadeContent}
      </div>
    </>
  );
}
