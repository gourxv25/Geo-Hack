import { useEffect, useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";

import { useIntelligence } from "@/context/IntelligenceContext";
import { useNewsFeed } from "@/hooks/useBackendData";
import {
  getNewsById,
  normalizeNewsCategoryFilter,
  normalizeNewsRegionFilter,
  type NewsDetail,
  type NewsPreview,
  WS_NEWS_URL,
} from "@/lib/api";
import NewsFilters from "@/components/news/NewsFilters";
import InfiniteScrollList from "@/components/news/InfiniteScrollList";

const NewsPanel = () => {
  const { newsCategory, newsRegion, newsStartDate, newsEndDate } = useIntelligence();

  const feed = useNewsFeed({
    startDate: newsStartDate || undefined,
    endDate: newsEndDate || undefined,
    category: newsCategory || undefined,
    region: newsRegion || undefined,
    limit: 20,
  });

  const [liveEvents, setLiveEvents] = useState<NewsPreview[]>([]);
  const [selected, setSelected] = useState<NewsDetail | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_NEWS_URL);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          id?: string;
          title?: string;
          summary?: string;
          source?: string;
          published_at?: string;
          category?: string;
          domain?: string;
          region?: string;
        };

        const id = String(payload.id || "").trim();
        const title = String(payload.title || "").trim();
        if (!id || !title) return;

        // Keep websocket stream aligned with active filters.
        const wsCategory = normalizeNewsCategoryFilter(String(payload.category || payload.domain || ""))?.toLowerCase();
        const activeCategory = normalizeNewsCategoryFilter(newsCategory)?.toLowerCase();
        if (activeCategory && wsCategory && wsCategory !== activeCategory) {
          return;
        }
        const wsRegion = normalizeNewsRegionFilter(payload.region)?.toLowerCase();
        const activeRegion = normalizeNewsRegionFilter(newsRegion)?.toLowerCase();
        if (activeRegion && wsRegion && wsRegion !== activeRegion) {
          return;
        }

        const item: NewsPreview = {
          id,
          title,
          summary: String(payload.summary || ""),
          source: String(payload.source || "Unknown"),
          timestamp: String(payload.published_at || new Date().toISOString()),
        };
        setLiveEvents((prev) => [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 40));
      } catch {
        // Ignore malformed WS payload.
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [newsCategory, newsRegion]);

  const dbItems = useMemo(
    () => (feed.data?.pages ?? []).flatMap((page) => page.articles),
    [feed.data?.pages]
  );

  const mergedItems = useMemo(() => {
    const map = new Map<string, NewsPreview>();
    for (const item of liveEvents) {
      map.set(item.id, item);
    }
    for (const item of dbItems) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values()).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [dbItems, liveEvents]);

  const openDetail = async (id: string) => {
    setLoadingDetailId(id);
    try {
      const detail = await getNewsById(id);
      setSelected(detail);
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <>
      <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-[#0d141f]/95 p-4 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">News Feed</h3>
          <span className="text-[11px] text-text-secondary">{feed.data?.pages?.[0]?.total ?? 0} total</span>
        </div>

        <NewsFilters />

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {feed.isLoading ? (
            <div className="text-sm text-text-secondary">Loading news...</div>
          ) : (
            <InfiniteScrollList
              items={mergedItems}
              hasMore={Boolean(feed.hasNextPage)}
              isLoadingMore={feed.isFetchingNextPage}
              onLoadMore={() => {
                if (feed.hasNextPage) feed.fetchNextPage();
              }}
              emptyState={<div className="text-sm text-text-secondary">No news found for selected filters.</div>}
              renderItem={(item) => (
                <button
                  onClick={() => openDetail(item.id)}
                  className="w-full rounded-lg border border-[#2a3645] bg-[#101928] p-3 text-left hover:border-coral/70"
                >
                  <p className="mb-1 text-[11px] text-text-secondary">{new Date(item.timestamp).toLocaleString()}</p>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.summary || "No summary available."}</p>
                  <p className="mt-1 text-[10px] text-coral">{item.source}</p>
                  {loadingDetailId === item.id && <p className="mt-1 text-[11px] text-text-secondary">Loading full article...</p>}
                </button>
              )}
            />
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-[#101822] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h4 className="text-lg font-semibold text-white">{selected.title}</h4>
              <button onClick={() => setSelected(null)} className="text-text-secondary hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-xs text-text-secondary">{new Date(selected.timestamp).toLocaleString()}</p>
            <p className="mb-3 text-sm text-text-secondary">{selected.summary}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/95">{selected.content}</p>
            <div className="mt-4 border-t border-border pt-3 text-xs text-text-secondary">
              <span className="mr-2">Source: {selected.source}</span>
              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-coral hover:underline"
                >
                  Open original
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewsPanel;
