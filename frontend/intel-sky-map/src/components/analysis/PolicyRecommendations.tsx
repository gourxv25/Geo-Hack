import { Shield, Clock, AlertTriangle, Users } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useAnalysisData } from "@/hooks/useBackendData";

const iconBySection = [AlertTriangle, Clock, Shield, Users];
const colorBySection = ["text-coral", "text-blue-400", "text-emerald-400", "text-amber-400"];

const PolicyRecommendations = () => {
  const { selectedCountry } = useIntelligence();
  const { data } = useAnalysisData(selectedCountry);

  const sections = data?.policy_recommendations ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Policy Recommendations</h3>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {sections.map((section, i) => {
          const Icon = iconBySection[i] ?? Shield;
          const color = colorBySection[i] ?? "text-coral";
          return (
            <div key={i} className="bg-accent rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-[11px] font-semibold text-foreground">{section.title}</span>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-[10px] text-text-secondary leading-relaxed">
                    <span className="w-1 h-1 rounded-full bg-text-secondary mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {sections.length === 0 && <div className="text-xs text-text-secondary">No policy recommendations available.</div>}
      </div>
    </div>
  );
};

export default PolicyRecommendations;
