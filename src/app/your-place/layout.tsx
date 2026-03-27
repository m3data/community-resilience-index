import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Place — Exposure Profile",
  description:
    "Your community's structural shape, which pressures reach you hardest, and the signals worth watching. Per-postcode intelligence from official data.",
};

export default function YourPlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
