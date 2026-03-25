export function System({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-600 mt-2" />
      <div>
        <h4 className="font-heading font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}
