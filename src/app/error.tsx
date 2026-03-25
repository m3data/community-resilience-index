'use client';

import Link from "next/link";
import { Warning, ArrowClockwise, House } from "@phosphor-icons/react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Warning size={32} className="text-amber-700" weight="duotone" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-green-900">
          Something went wrong
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          Something broke. It&apos;s likely a live data source — try again
          in a moment or head back to the homepage.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-green-900 font-semibold px-6 py-3 rounded-lg transition-colors text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            <ArrowClockwise size={20} weight="bold" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-green-900 border border-gray-200 font-medium px-6 py-3 rounded-lg transition-colors text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <House size={20} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
