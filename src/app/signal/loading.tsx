export default function SignalLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="h-4 w-32 bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-10 w-64 bg-gray-700 rounded animate-pulse" />
          <div className="mt-4 h-5 w-full max-w-lg bg-gray-800 rounded animate-pulse" />
          <div className="mt-2 h-5 w-72 bg-gray-800 rounded animate-pulse" />
          <div className="mt-3 h-3 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
      </section>

      {/* Cascade explanation skeleton */}
      <section className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="h-4 w-full bg-amber-200/60 rounded animate-pulse" />
          <div className="mt-2 h-4 w-3/4 bg-amber-200/60 rounded animate-pulse" />
        </div>
      </section>

      {/* Signal card skeletons */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <SignalCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SignalCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row gap-4">
      <div className="sm:w-48 flex-shrink-0">
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="flex items-baseline gap-2 mt-2">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="flex-1 sm:border-l sm:border-gray-100 sm:pl-6 space-y-2">
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
