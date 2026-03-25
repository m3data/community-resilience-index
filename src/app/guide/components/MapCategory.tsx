export function MapCategory({
  title,
  items,
  className = "",
}: {
  title: string;
  items: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <h4 className="font-heading font-semibold text-green-800 mb-1">
        {title}
      </h4>
      <p className="text-sm text-gray-600">{items}</p>
    </div>
  );
}
