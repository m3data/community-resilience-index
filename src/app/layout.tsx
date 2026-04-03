import type { Metadata } from "next";
import { DM_Sans, Fraunces, DM_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://australia.communityresilienceindex.net"),
  title: {
    default: "Community Resilience Index — Australia",
    template: "%s — Community Resilience Index",
  },
  description:
    "Postcode-level exposure profiles for Australian communities. See where supply chain pressure reaches your postcode, track live signals across 6 cascade layers, and find out what your community can do about it. Built on ABS Census data and 17+ live public data feeds.",
  authors: [{ name: "Mat Mytka", url: "https://matmytka.com" }],
  openGraph: {
    title: "Community Resilience Index — Australia",
    description:
      "Where the pressure is, who it reaches, and what your community can do about it. Postcode-level exposure profiles powered by live public data across fuel, food, electricity, housing, economic, and emergency domains.",
    siteName: "Community Resilience Index",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Resilience Index — Australia",
    description:
      "Where the pressure is, who it reaches, and what your community can do about it. Postcode-level exposure profiles for Australian communities.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Skip link — keyboard accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-green-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>

        <Nav />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-green-100 mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <p className="font-heading font-semibold text-green-900">
                  Community Resilience Index
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Open data. Peer-reviewed methods. Community action.
                </p>
              </div>
              <div className="text-sm text-gray-500 flex flex-col sm:items-end gap-1">
                <div className="flex gap-4">
                  <a href="/methodology" className="text-green-700 hover:underline">Methodology</a>
                  <a
                    href="https://github.com/m3data/community-resilience-index"
                    className="text-green-700 hover:underline"
                    target="_blank"
                    rel="noopener"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://collectivefuturecrafting.net"
                    className="text-green-700 hover:underline"
                    target="_blank"
                    rel="noopener"
                  >
                    collectivefuturecrafting.net
                  </a>
                </div>
                <p>Free to use, adapt, and share.</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
