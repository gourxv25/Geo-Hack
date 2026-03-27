import { ExternalLink, Shield } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useAnalysisData } from "@/hooks/useBackendData";

const getReliabilityColor = (score: number) => {
  if (score >= 95) return "text-emerald-400";
  if (score >= 90) return "text-blue-400";
  return "text-amber-400";
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const SourceCitations = () => {
  const { selectedCountry } = useIntelligence();
  const { data } = useAnalysisData(selectedCountry);
  const sources = data?.source_citations ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Sources & Transparency</h3>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-accent rounded-lg p-2.5 hover:bg-elevated transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate group-hover:text-coral transition-colors">{src.name}</p>
                <p className="text-[9px] text-text-secondary mt-0.5 truncate">{src.url}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-text-secondary group-hover:text-coral transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <Shield className={`w-3 h-3 ${getReliabilityColor(src.reliability)}`} />
                <span className={`text-[10px] font-medium ${getReliabilityColor(src.reliability)}`}>{src.reliability}% reliable</span>
              </div>
              <span className="text-[9px] text-text-secondary">{formatDate(src.timestamp)}</span>
            </div>
          </a>
        ))}
        {sources.length === 0 && <div className="text-xs text-text-secondary">No source citations available.</div>}
      </div>
    </div>
  );
};

export default SourceCitations;
