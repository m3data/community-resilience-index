export function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-heading font-bold text-green-900 mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="flex-shrink-0 w-4 h-4 border-2 border-gray-300 rounded mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
