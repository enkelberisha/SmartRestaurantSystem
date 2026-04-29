export function SkeletonBlock({ className = "" }: { className?: string }) {
    return <div className={`skeleton-block ${className}`.trim()} aria-hidden="true" />;
}
