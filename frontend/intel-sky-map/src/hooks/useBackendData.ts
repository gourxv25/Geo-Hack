import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { getAnalysis, getDashboard, getIntelligence, getNewsPreviews, sendChat } from "@/lib/api";

export function useDashboardData(country: string) {
  return useQuery({
    queryKey: ["dashboard", country],
    queryFn: () => getDashboard(country),
    staleTime: 60_000,
  });
}

export function useIntelligenceData(country: string) {
  return useQuery({
    queryKey: ["intelligence", country],
    queryFn: () => getIntelligence(country),
    staleTime: 60_000,
  });
}

export function useAnalysisData(country: string) {
  return useQuery({
    queryKey: ["analysis", country],
    queryFn: () => getAnalysis(country),
    staleTime: 60_000,
  });
}

export function useAnalysisChat() {
  return useMutation({
    mutationFn: ({
      question,
      country,
      sessionId,
      startDate,
      endDate,
      category,
      region,
    }: {
      question: string;
      country: string;
      sessionId?: string;
      startDate?: string;
      endDate?: string;
      category?: string;
      region?: string;
    }) =>
      sendChat(question, country, sessionId, {
        start_date: startDate,
        end_date: endDate,
        category,
        region,
      }),
  });
}

export function useNewsFeed(filters: {
  startDate?: string;
  endDate?: string;
  category?: string;
  region?: string;
  limit?: number;
}) {
  const limit = filters.limit ?? 20;
  return useInfiniteQuery({
    queryKey: ["news-feed", filters.startDate, filters.endDate, filters.category, filters.region, limit],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getNewsPreviews({
        start_date: filters.startDate,
        end_date: filters.endDate,
        category: filters.category,
        region: filters.region,
        limit,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    staleTime: 30_000,
  });
}
