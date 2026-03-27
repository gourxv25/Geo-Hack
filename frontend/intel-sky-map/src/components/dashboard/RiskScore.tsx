import { useState } from "react";
import { Brain } from "lucide-react";
import ExplainableAI, { riskScoreExplain, type ExplainableData } from "./ExplainableAI";

interface RiskScoreProps {
  score?: number;
  primaryDriver?: string;
  explanation?: ExplainableData;
}

const RiskScore = ({
  score = 8.5,
  primaryDriver = "Energy Supply Disruption",
  explanation,
}: RiskScoreProps) => {
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-2.5 rounded-md bg-surface border border-border">
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-[9px] uppercase tracking-widest text-text-secondary font-semibold mb-0.5">
            Risk Score
          </span>
          <span className="text-2xl font-bold text-coral leading-none">{score.toFixed(1)}</span>
          <span className="text-[9px] text-coral-muted mt-0.5">/ 10</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-secondary">Primary Driver</span>
          <span className="text-xs font-medium text-foreground">{primaryDriver}</span>
          <span className="text-[10px] text-text-secondary">AI trend monitoring active</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setExplainOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold text-coral hover:bg-coral/10 transition-colors"
            title="Why this score?"
          >
            <Brain className="w-3 h-3" />
            Why?
          </button>
        </div>
      </div>
      <ExplainableAI open={explainOpen} onOpenChange={setExplainOpen} data={explanation ?? riskScoreExplain} />
    </>
  );
};

export default RiskScore;
