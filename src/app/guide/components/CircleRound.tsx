export function CircleRound({
  name,
  time,
  description,
}: {
  name: string;
  time: string;
  description: string;
}) {
  return (
    <div className="border-l-3 border-green-300 pl-5">
      <div className="flex items-baseline gap-2 mb-1">
        <h4 className="font-heading font-semibold text-gray-900">{name}</h4>
        <span className="text-xs text-gray-400 font-mono">{time}</span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
