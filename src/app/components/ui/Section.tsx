/**
 * Section — reusable content section wrapper with heading.
 * Extracted from guide/page.tsx for cross-page use.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10 [&>p]:mt-4 [&>p]:text-gray-700 [&>p]:leading-relaxed [&>p:first-child]:mt-0">
      <h2 className="font-heading text-2xl font-bold text-green-900 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
