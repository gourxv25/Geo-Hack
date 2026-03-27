import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface IntelligenceState {
  selectedCountry: string;
  setSelectedCountry: (c: string) => void;
  activeFilters: string[];
  setActiveFilters: (f: string[]) => void;
  aiAppliedContext: string | null;
  processQuery: (query: string) => void;
}

const regionKeywords: Record<string, string> = {
  india: "India",
  china: "China",
  "middle east": "Middle East",
  europe: "Europe",
  africa: "Africa",
  americas: "Americas",
  "south asia": "India",
  "east asia": "China",
  russia: "Russia",
  japan: "Japan",
  "indo-pacific": "India",
  global: "Global",
};

const domainKeywords: Record<string, string> = {
  energy: "economic",
  oil: "economic",
  trade: "economic",
  economic: "economic",
  conflict: "geopolitical",
  war: "geopolitical",
  geopolitical: "geopolitical",
  military: "defense",
  defense: "defense",
  naval: "defense",
  cyber: "technological",
  technology: "technological",
  climate: "climate",
  weather: "climate",
};

const IntelligenceContext = createContext<IntelligenceState | null>(null);

export const useIntelligence = () => {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error("useIntelligence must be used within IntelligenceProvider");
  return ctx;
};

export const IntelligenceProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [activeFilters, setActiveFilters] = useState(["geopolitical", "economic"]);
  const [aiAppliedContext, setAiAppliedContext] = useState<string | null>(null);

  const processQuery = useCallback((query: string) => {
    const lower = query.toLowerCase();
    let detectedRegion: string | null = null;
    let detectedDomains: string[] = [];

    for (const [keyword, region] of Object.entries(regionKeywords)) {
      if (lower.includes(keyword)) {
        detectedRegion = region;
        break;
      }
    }

    for (const [keyword, domain] of Object.entries(domainKeywords)) {
      if (lower.includes(keyword) && !detectedDomains.includes(domain)) {
        detectedDomains.push(domain);
      }
    }

    if (detectedRegion) setSelectedCountry(detectedRegion);
    if (detectedDomains.length > 0) setActiveFilters(detectedDomains);

    if (detectedRegion || detectedDomains.length > 0) {
      const parts: string[] = [];
      if (detectedRegion) parts.push(detectedRegion);
      parts.push(...detectedDomains.map(d => d.charAt(0).toUpperCase() + d.slice(1)));
      setAiAppliedContext(parts.join(" • "));
      setTimeout(() => setAiAppliedContext(null), 5000);
    }
  }, []);

  return (
    <IntelligenceContext.Provider value={{ selectedCountry, setSelectedCountry, activeFilters, setActiveFilters, aiAppliedContext, processQuery }}>
      {children}
    </IntelligenceContext.Provider>
  );
};
