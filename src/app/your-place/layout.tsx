import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Place",
  description:
    "Look up your postcode to see your community's structural resilience score and crisis exposure profile. Powered by ABS Census data and peer-reviewed methodology.",
};

export default function YourPlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
