"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/methodology", label: "Overview" },
  { href: "/methodology/indicators", label: "Indicators" },
  { href: "/methodology/validation", label: "Validation" },
  { href: "/methodology/references", label: "References" },
] as const;

export function MethodologyNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-b border-gray-200 bg-[#F5F0E6]/85 backdrop-blur-sm sticky top-[49px] z-10"
      aria-label="Methodology sections"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6 overflow-x-auto text-sm">
        {SECTIONS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={active
                ? "py-3 text-green-700 font-medium border-b-2 border-green-700 whitespace-nowrap"
                : "py-3 text-gray-500 hover:text-green-700 whitespace-nowrap transition-colors"
              }
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
