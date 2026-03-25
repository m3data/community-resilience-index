/**
 * Badge — status/trend badge with colour variants.
 * Extracted from the signals page trendColor pattern.
 */

export type BadgeVariant = 'critical' | 'warning' | 'success' | 'neutral';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function Badge({
  variant,
  children,
  className = '',
  ...rest
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'className'>) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${VARIANT_STYLES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
