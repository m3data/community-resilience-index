export function Tip({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed mt-1">{text}</p>
    </div>
  );
}
