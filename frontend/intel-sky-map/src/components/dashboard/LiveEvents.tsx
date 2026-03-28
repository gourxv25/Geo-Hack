import { useEffect, useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { getNewsById, getNewsPreviews, type NewsDetail, WS_NEWS_URL } from "@/lib/api";

interface LiveEvent {
  id: string;
  region: string;
  text: string;
  time: string;
}

interface LiveEventsProps {
  events?: LiveEvent[];
}

const normalizeIso = (value: string) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const LiveEvents = ({ events = [] }: LiveEventsProps) => {
  const [items, setItems] = useState<LiveEvent[]>(events);
  const [selected, setSelected] = useState<NewsDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(events);
  }, [events]);

  useEffect(() => {
    const loadFallback = async () => {
      if (events.length > 0) return;
      try {
        const previews = await getNewsPreviews({ page: 1, limit: 8 });
        setItems(
          previews.articles.map((item) => ({
            id: item.id,
            region: item.source || "Global",
            text: item.title,
            time: normalizeIso(item.timestamp),
          }))
        );
      } catch {
        // Keep empty state if preview fetch fails.
      }
    };
    void loadFallback();
  }, [events]);

  useEffect(() => {
    const ws = new WebSocket(WS_NEWS_URL);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          id?: string;
          title?: string;
          category?: string;
          published_at?: string;
        };

        if (!data.id || !data.title) return;

        const incoming: LiveEvent = {
          id: String(data.id),
          region: String(data.category || "Global"),
          text: String(data.title),
          time: normalizeIso(String(data.published_at || "")),
        };

        setItems((prev) => {
          const merged = [incoming, ...prev.filter((p) => p.id !== incoming.id)];
          return merged.slice(0, 20);
        });
      } catch {
        // Ignore malformed websocket payloads.
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  const displayed = useMemo(() => items.slice(0, 8), [items]);

  const openDetail = async (id: string) => {
    setLoadingId(id);
    try {
      const detail = await getNewsById(id);
      setSelected(detail);
    } catch {
      setSelected({
        id,
        title: "Unable to load article",
        content: "Could not fetch full news content from backend.",
        source: "Unknown",
        timestamp: new Date().toISOString(),
        summary: "",
        url: "",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-semibold uppercase tracking-[0.08em] text-white sm:text-2xl">Live Events</h3>
        <span className="text-xl text-text-secondary">^</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
        {displayed.length > 0 ? (
          displayed.map((event) => (
            <button
              key={event.id}
              onClick={() => openDetail(event.id)}
              className="w-full rounded-xl border border-[#2d3949] bg-[#111a25]/78 p-3 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] hover:border-coral/70"
            >
              <p className="mb-1 text-xs tracking-wide text-text-secondary">{new Date(event.time).toLocaleString()}</p>
              <p className="text-sm leading-snug text-white/95 sm:text-base">
                <span className="font-medium text-coral">{event.region}: </span>
                {event.text}
              </p>
              {loadingId === event.id && <p className="mt-1 text-[11px] text-text-secondary">Loading full article...</p>}
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-border/70 bg-[#111a25]/70 p-4 text-sm text-text-secondary sm:text-base">
            No live events available.
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-[#101822] p-4">
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
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-coral hover:underline">
                  Open original
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveEvents;
