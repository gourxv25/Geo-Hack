import { useState } from "react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { TrendingUp, Shield, Crosshair, Cpu, CloudRain, X } from "lucide-react";
import { useIntelligenceData } from "@/hooks/useBackendData";

interface DomainMetric {
  id: string;
  label: string;
  icon: typeof TrendingUp;
  score: number;
  trend: "up" | "down" | "stable";
  change: string;
  linkedDomains: string[];
  insight: string;
}

const iconById: Record<string, typeof TrendingUp> = {
  economic: TrendingUp,
  geopolitical: Shield,
  military: Crosshair,
  defense: Crosshair,
  technological: Cpu,
  technology: Cpu,
  climate: CloudRain,
  social: Shield,
};

const ImpactMetrics = () => {
  const { selectedCountry } = useIntelligence();
  const { data } = useIntelligenceData(selectedCountry);
  const [expanded, setExpanded] = useState<string | null>(null);

  const metrics: DomainMetric[] = (data?.impact_metrics ?? []).map((m) => ({
      id: m.id,
      label: m.label,
      icon: iconById[m.id] ?? iconById[m.label.toLowerCase()] ?? Shield,
      score: m.score,
      trend: m.trend,
      change: m.change,
      linkedDomains: m.linkedDomains,
      insight: m.insight,
    }));

  const scoreColor = (s: number) => {
    if (s >= 8) return "text-coral";
    if (s >= 6) return "text-yellow-400";
    return "text-emerald-400";
  };

  const scoreBg = (s: number) => {
    if (s >= 8) return "bg-coral/10";
    if (s >= 6) return "bg-yellow-500/10";
    return "bg-emerald-500/10";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-0.5">Cross-Domain Impact</h2>
          <p className="text-sm font-medium text-foreground">{selectedCountry} - Domain Scores</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={() => setExpanded(expanded === m.id ? null : m.id)}
            className={`rounded-md border border-border p-3 text-left transition-all duration-200 hover:border-coral/30 ${
              expanded === m.id ? "bg-elevated border-coral/40" : "bg-surface"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <m.icon className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{m.label}</span>
            </div>
            <div className={`text-xl font-bold ${scoreColor(m.score)}`}>{m.score}</div>
            <div
              className={`text-[10px] font-medium mt-0.5 ${
                m.trend === "up" ? "text-coral" : m.trend === "down" ? "text-emerald-400" : "text-text-secondary"
              }`}
            >
              {m.change} {m.trend === "up" ? "?" : m.trend === "down" ? "?" : "?"}
            </div>
          </button>
        ))}
      </div>
      {metrics.length === 0 && <div className="text-xs text-text-secondary mt-2">No impact metrics available.</div>}

      {expanded && (() => {
        const m = metrics.find((x) => x.id === expanded);
        if (!m) return null;
        return (
          <div className="mt-2 p-3 rounded-md border border-border bg-elevated animate-[fade-in_0.2s_ease-out]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${scoreBg(m.score)}`}>
                  <m.icon className={`w-4 h-4 ${scoreColor(m.score)}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{m.label} Impact</h3>
                  <p className="text-[10px] text-text-secondary">Linked: {m.linkedDomains.join(", ")}</p>
                </div>
              </div>
              <button onClick={() => setExpanded(null)} className="text-text-secondary hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">{m.insight}</p>
          </div>
        );
      })()}
    </div>
  );
};

export default ImpactMetrics;
