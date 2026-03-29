import {
  Grains,
  Car,
  Wrench,
  Buildings,
  Heart,
} from "@phosphor-icons/react/dist/ssr";

const CATEGORY_ICONS: Record<string, typeof Grains> = {
  Food: Grains,
  Transport: Car,
  Skills: Wrench,
  Spaces: Buildings,
  "People who need reaching": Heart,
};

const CATEGORY_COLOURS: Record<string, { bg: string; icon: string; border: string }> = {
  Food: { bg: "bg-green-50", icon: "text-green-700", border: "border-green-200" },
  Transport: { bg: "bg-amber-50", icon: "text-amber-700", border: "border-amber-200" },
  Skills: { bg: "bg-gray-50", icon: "text-gray-600", border: "border-gray-200" },
  Spaces: { bg: "bg-green-50", icon: "text-green-700", border: "border-green-200" },
  "People who need reaching": { bg: "bg-amber-50", icon: "text-amber-700", border: "border-amber-200" },
};

export function MapCategory({
  title,
  items,
  className = "",
}: {
  title: string;
  items: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[title] ?? Wrench;
  const colours = CATEGORY_COLOURS[title] ?? CATEGORY_COLOURS.Skills;

  return (
    <div
      className={`rounded-xl border ${colours.border} ${colours.bg} p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} weight="duotone" className={colours.icon} />
        </div>
        <h4 className="font-heading font-semibold text-gray-900">
          {title}
        </h4>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{items}</p>
    </div>
  );
}
