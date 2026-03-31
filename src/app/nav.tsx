"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/your-place", label: "Your Place" },
  { href: "/signals", label: "Signals" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile nav on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  return (
    <nav
      className="border-b border-green-100 bg-[#F5F0E6]/85 backdrop-blur-sm sticky top-0 z-50"
      aria-label="Main navigation"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded"
        >
          <span className="font-heading font-bold text-green-900 text-base sm:text-lg">
            Community Resilience Index
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded px-1 py-0.5 ${
                pathname === href
                  ? "text-green-900 font-semibold"
                  : "text-gray-600 hover:text-green-800"
              }`}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/guide"
            className={`px-4 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 ${
              pathname === "/guide"
                ? "bg-green-800 text-white font-semibold"
                : "text-green-800 bg-green-100 hover:bg-green-700 hover:text-white"
            }`}
            aria-current={pathname === "/guide" ? "page" : undefined}
          >
            Take Action
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <div
          id="mobile-nav"
          className="sm:hidden border-t border-gray-100 bg-white"
        >
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 ${
                  pathname === href
                    ? "bg-green-50 text-green-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-green-800"
                }`}
                aria-current={pathname === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/guide"
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 ${
                pathname === "/guide"
                  ? "bg-green-800 text-white font-semibold"
                  : "bg-green-100 text-green-800 hover:bg-green-700 hover:text-white"
              }`}
              aria-current={pathname === "/guide" ? "page" : undefined}
            >
              Take Action
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
