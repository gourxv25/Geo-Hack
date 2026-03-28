import { useEffect, useRef } from "react";

type Props<T> = {
  items: T[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  renderItem: (item: T) => JSX.Element;
  emptyState?: JSX.Element;
};

export default function InfiniteScrollList<T>({
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  renderItem,
  emptyState,
}: Props<T>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (items.length === 0) {
    return emptyState ?? <div className="text-xs text-text-secondary">No results.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx}>{renderItem(item)}</div>
      ))}
      <div ref={sentinelRef} className="h-1" />
      {isLoadingMore && <div className="text-center text-[11px] text-text-secondary">Loading more...</div>}
    </div>
  );
}
