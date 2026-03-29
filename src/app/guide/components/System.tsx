import {
  Plant,
  Basket,
  HandHeart,
  Toolbox,
  Lightning,
  GasPump,
} from "@phosphor-icons/react/dist/ssr";

const SYSTEM_ICONS: Record<string, typeof Plant> = {
  "Community garden": Plant,
  "Local food network": Basket,
  "Skills exchange": HandHeart,
  "Shared resources": Toolbox,
  "Energy and transport": Lightning,
  "Fuel pooling and transport sharing": GasPump,
};

export function System({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const Icon = SYSTEM_ICONS[title] ?? Plant;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-green-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon size={18} weight="duotone" className="text-green-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-700 leading-relaxed mt-1.5">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
