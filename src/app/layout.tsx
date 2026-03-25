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
  metadataBase: new URL("https://communityresilience.au"),
  title: {
    default: "Community Resilience Index — Australia",
    template: "%s — Community Resilience Index",
  },
  description:
    "Postcode-level resilience intelligence for Australian communities. Structural capacity, crisis exposure, and what you can do about it.",
  openGraph: {
    title: "Community Resilience Index",
    description:
      "See your community's structural resilience and crisis exposure. Built on peer-reviewed methodology, powered by open data.",
    siteName: "Community Resilience Index",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Resilience Index",
    description:
      "How resilient is your community? Postcode-level resilience intelligence for Australia.",
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
              <div className="text-sm text-gray-500">
                <p>
                  Free to use, adapt, and share.
                </p>
                <p className="mt-1">
                  <a
                    href="https://collectivefuturecrafting.net"
                    className="text-green-700 hover:underline focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded"
                    target="_blank"
                    rel="noopener"
                  >
                    collectivefuturecrafting.net
                  </a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
