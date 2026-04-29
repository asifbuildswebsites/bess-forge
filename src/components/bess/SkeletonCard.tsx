interface SkeletonCardProps {
  showLabel?: boolean;
  showValue?: boolean;
  wide?: boolean;
}

export function SkeletonCard({ showLabel = true, showValue = true, wide = false }: SkeletonCardProps) {
  return (
    <div className={`rounded-sm border border-border bg-panel p-4 ${wide ? 'col-span-full' : ''}`}>
      {showLabel && (
        <div className="h-2 w-20 bg-muted animate-shimmer rounded mb-3" />
      )}
      {showValue && (
        <div className="flex items-baseline gap-2">
          <div className="h-6 w-16 bg-muted animate-shimmer rounded" />
          <div className="h-3 w-8 bg-muted animate-shimmer rounded" />
        </div>
      )}
    </div>
  );
}

export function SkeletonMetricGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-muted animate-shimmer rounded"
          style={{ width: `${100 - i * 10}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export function SkeletonAuditTrail() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-3 bg-muted animate-shimmer rounded-full" />
          <div className="h-3 bg-muted animate-shimmer rounded flex-1" style={{ width: `${80 - i * 5}%` }} />
        </div>
      ))}
    </div>
  );
}