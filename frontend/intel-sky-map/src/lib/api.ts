export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ??
  "http://localhost:8000/api/v1";

export const WS_NEWS_URL =
  import.meta.env.VITE_WS_NEWS_URL?.toString() ||
  `${API_BASE_URL.replace(/^http/i, "ws").replace(/\/api\/v1$/, "")}/ws/news`;

const CATEGORY_FILTER_ALIASES: Record<string, string> = {
  geopolitical: "geopolitics",
  geopolitics: "geopolitics",
  global: "global",
  economic: "economy",
  economy: "economy",
  business: "economy",
  finance: "economy",
  defense: "defense",
  military: "defense",
  technology: "tech",
  technological: "tech",
  tech: "tech",
  science: "science",
  climate: "climate",
  health: "health",
  sports: "sports",
};

const REGION_FILTER_ALIASES: Record<string, string> = {
  india: "Asia Pacific",
  china: "Asia Pacific",
  japan: "Asia Pacific",
  "south asia": "Asia Pacific",
  "east asia": "Asia Pacific",
  "indo-pacific": "Asia Pacific",
  "united states": "North America",
  usa: "North America",
  canada: "North America",
  mexico: "North America",
  americas: "North America",
  europe: "Europe",
  uk: "Europe",
  russia: "Europe",
  germany: "Europe",
  france: "Europe",
  "middle east": "Middle East",
  iran: "Middle East",
  israel: "Middle East",
  saudi: "Middle East",
  qatar: "Middle East",
  africa: "Africa",
  brazil: "South America",
  argentina: "South America",
  chile: "South America",
  peru: "South America",
  colombia: "South America",
  global: "Global",
};

export function normalizeNewsCategoryFilter(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return CATEGORY_FILTER_ALIASES[raw.toLowerCase()] ?? raw;
}

export function normalizeNewsRegionFilter(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return REGION_FILTER_ALIASES[raw.toLowerCase()] ?? raw;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    // Try to parse error response as JSON first
    try {
      const errorJson = await response.json();
      // Check if it's our envelope format with detail wrapper
      if (errorJson.detail && typeof errorJson.detail === 'object' && 'message' in errorJson.detail) {
        throw new Error(errorJson.detail.message || `Request failed with ${response.status}`);
      }
      // Check if it's already envelope format
      if (errorJson.message) {
        throw new Error(errorJson.message);
      }
      // Fallback to detail string
      throw new Error(errorJson.detail || `Request failed with ${response.status}`);
    } catch (parseError) {
      // If JSON parsing fails, try text
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }
  }

  const json = (await response.json()) as ApiEnvelope<T>;
  if (!json.success) {
    throw new Error(json.message || "API request failed");
  }

  return json.data;
}

export type DashboardPayload = {
  selected_country: string;
  overall_risk_score: number;
  primary_driver: string;
  alerts: string[];
  live_events: Array<{ id: string; region: string; text: string; time: string }>;
  map_connections: Array<{ label: string; impact: number; code: string }>;
  risk_explanation: {
    title: string;
    key_factors: string[];
    chain: string[];
    confidence: number;
    sources: Array<{ name: string; url: string; timestamp: string; reliability: string }>;
  };
};

export type IntelligencePayload = {
  selected_country: string;
  heatmap: Array<{
    name: string;
    risk: number;
    region: string;
    lat: number;
    lng: number;
    risk_level: string;
  }>;
  causal_chain: {
    nodes: Array<{
      id: string;
      title: string;
      domain: "Political" | "Economic" | "Military" | "Technological" | "Climate";
      impact: number;
      description: string;
      factors: string[];
    }>;
    edges: Array<{ from: string; to: string; confidence: number }>;
  };
  impact_metrics: Array<{
    id: string;
    label: string;
    score: number;
    trend: "up" | "down" | "stable";
    change: string;
    linkedDomains: string[];
    insight: string;
  }>;
  early_warning: Array<{ day: string; label: string; risk: "critical" | "high" | "medium" | "low"; description: string }>;
};

export type AnalysisPayload = {
  selected_country: string;
  policy_recommendations: Array<{ title: string; items: string[] }>;
  source_citations: Array<{ name: string; url: string; reliability: number; timestamp: string }>;
  risk_timeline: Array<{ day: number; date: string; score: number; event?: string | null }>;
};

export type ChatResponse = {
  question: string;
  country: string;
  session_id?: string;
  answer: string;
  reasoning_chain: string[];
  supporting_facts: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  context_used?: string;
  confidence?: "high" | "medium" | "low";
  confidence_score?: number;
  data_sources?: string[];
};

export type NewsPreview = {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
};

export type NewsListResponse = {
  articles: NewsPreview[];
  next_cursor?: string | null;
  total: number;
};

export type NewsDetail = {
  id: string;
  title: string;
  content: string;
  source: string;
  timestamp: string;
  summary: string;
  url: string;
};

export async function getDashboard(country: string): Promise<DashboardPayload> {
  const encoded = encodeURIComponent(country);
  return request<DashboardPayload>(`/frontend/dashboard?country=${encoded}`);
}

export async function getIntelligence(country: string): Promise<IntelligencePayload> {
  const encoded = encodeURIComponent(country);
  return request<IntelligencePayload>(`/frontend/intelligence/${encoded}`);
}

export async function getAnalysis(country: string): Promise<AnalysisPayload> {
  const encoded = encodeURIComponent(country);
  return request<AnalysisPayload>(`/frontend/analysis/${encoded}`);
}

export async function sendChat(
  question: string,
  country: string,
  sessionId?: string,
  filters?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    region?: string;
  }
): Promise<ChatResponse> {
  return request<ChatResponse>("/frontend/analysis/chat", {
    method: "POST",
    body: JSON.stringify({
      question,
      country,
      session_id: sessionId,
      ...(filters ?? {}),
    }),
  });
}

export async function getNewsPreviews(params?: {
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  cursor?: string;
  source?: string;
  category?: string;
  region?: string;
  domain?: string;
}): Promise<NewsListResponse> {
  const normalizedCategory = normalizeNewsCategoryFilter(params?.category);
  const normalizedRegion = normalizeNewsRegionFilter(params?.region);
  const fetchNews = async (overrides?: { category?: string; region?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) query.set("cursor", params.cursor);
    if (params?.source) query.set("source", params.source);
    if ((overrides?.category ?? normalizedCategory)) query.set("category", overrides?.category ?? normalizedCategory!);
    if ((overrides?.region ?? normalizedRegion)) query.set("region", overrides?.region ?? normalizedRegion!);
    if (params?.domain) query.set("domain", params.domain);

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${API_BASE_URL}/news${suffix}`);
    if (!response.ok) throw new Error(`Failed to fetch news list (${response.status})`);
    return (await response.json()) as NewsListResponse;
  };

  const primary = await fetchNews();
  if (primary.total > 0 || (!normalizedCategory && !normalizedRegion)) return primary;

  if (normalizedRegion) {
    const withoutRegion = await fetchNews({ region: "" });
    if (withoutRegion.total > 0) return withoutRegion;
  }

  if (normalizedCategory) {
    const withoutCategory = await fetchNews({ category: "", region: "" });
    if (withoutCategory.total > 0) return withoutCategory;
  }

  return primary;
}

export async function getNewsById(id: string): Promise<NewsDetail> {
  const response = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`Failed to fetch news item (${response.status})`);
  return (await response.json()) as NewsDetail;
}
