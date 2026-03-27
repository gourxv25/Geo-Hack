import { useNavigate } from "react-router-dom";
import { useIntelligence } from "@/context/IntelligenceContext";
import RiskHeatmap from "@/components/intelligence/RiskHeatmap";
import CausalChain from "@/components/intelligence/CausalChain";
import ImpactMetrics from "@/components/intelligence/ImpactMetrics";
import EarlyWarning from "@/components/intelligence/EarlyWarning";
import { ArrowLeft, Globe } from "lucide-react";

const Intelligence = () => {
  const navigate = useNavigate();
  const { selectedCountry } = useIntelligence();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-text-secondary hover:text-foreground transition-colors text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <div className="w-px h-4 bg-border" />
          <Globe className="w-4 h-4 text-coral" />
          <span className="text-sm font-semibold tracking-wide text-foreground">
            INTELLIGENCE ANALYSIS
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider">
            Focus: <span className="text-foreground font-medium">{selectedCountry}</span>
          </span>
          <div className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
          <span className="text-[10px] text-text-secondary">LIVE</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center content */}
        <main className="flex-1 flex flex-col overflow-y-auto scrollbar-thin p-4 gap-4">
          {/* Risk Heatmap */}
          <div className="h-[250px] flex-shrink-0">
            <RiskHeatmap />
          </div>

          {/* Causal Chain */}
          <CausalChain />

          {/* Impact Metrics */}
          <ImpactMetrics />
        </main>

        {/* Right sidebar - Early Warning */}
        <aside className="w-72 border-l border-border bg-surface flex-shrink-0">
          <EarlyWarning />
        </aside>
      </div>
    </div>
  );
};

export default Intelligence;
