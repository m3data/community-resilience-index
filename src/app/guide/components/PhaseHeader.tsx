export function PhaseHeader({
  number,
  title,
  timing,
}: {
  number: string;
  title: string;
  timing: string;
}) {
  return (
    <div className="mt-16 mb-6 flex items-baseline gap-4 border-b-2 border-green-200 pb-3">
      <span className="font-heading font-bold text-green-600 text-sm uppercase tracking-wider">
        Phase {number}
      </span>
      <h2 className="font-heading text-2xl font-bold text-green-900">
        {title}
      </h2>
      <span className="text-sm text-gray-400 ml-auto">{timing}</span>
    </div>
  );
}
