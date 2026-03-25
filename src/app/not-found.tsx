import Link from "next/link";
import Image from "next/image";
import { MapPin, House } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="mx-auto mb-6 opacity-80">
          <Image src="/peeps/standing-8.svg" alt="" width={100} height={200} className="mx-auto" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-green-900">
          Page not found
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          This page doesn&apos;t exist — or it&apos;s moved. Try your
          postcode or start from the homepage.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-green-900 hover:bg-green-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <House size={20} weight="bold" />
            Back to Home
          </Link>
          <Link
            href="/your-place"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-green-900 border border-gray-200 font-medium px-6 py-3 rounded-lg transition-colors text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <MapPin size={20} />
            Check Your Postcode
          </Link>
        </div>
      </div>
    </div>
  );
}
