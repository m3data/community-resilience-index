export function Tip({
  title,
  text,
  number,
}: {
  title: string;
  text: string;
  number?: number;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {number && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex-shrink-0 mt-0.5">
            {number}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed mt-1.5">{text}</p>
        </div>
      </div>
    </div>
  );
}
