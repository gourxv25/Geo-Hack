import { Globe } from "lucide-react";
import FilterPanel from "@/components/dashboard/FilterPanel";
import WorldMap from "@/components/dashboard/WorldMap";
import LiveEvents from "@/components/dashboard/LiveEvents";
import AIAssistant from "@/components/dashboard/AIAssistant";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useDashboardData } from "@/hooks/useBackendData";

const Index = () => {
  const { selectedCountry } = useIntelligence();
  const { data: dashboard } = useDashboardData(selectedCountry);

  const score = dashboard?.overall_risk_score ?? 6.2;
  const activeCountry = dashboard?.selected_country ?? selectedCountry;

  return (
    <div className="relative h-screen overflow-hidden bg-intel-canvas text-foreground">
      <div className="pointer-events-none absolute inset-0 intel-gradient" />

      <header className="relative z-10 flex flex-col gap-3 border-b border-border/60 px-4 py-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <div className="intel-icon-shell">
            <Globe className="h-5 w-5 text-coral" />
          </div>
          <span className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[35px]">
            Global Intelligence Dashboard
          </span>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end lg:gap-3">
          <div className="intel-chip text-xs uppercase tracking-[0.12em] text-text-secondary sm:text-sm">
            Total Risk Score: <span className="font-semibold text-coral">{score.toFixed(1)} / 10</span>
          </div>
          <div className="intel-chip text-xs uppercase tracking-[0.12em] text-text-secondary sm:text-sm">
            Selected: <span className="font-semibold text-coral">{activeCountry}</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex h-[calc(100vh-138px)] flex-col overflow-auto lg:h-[calc(100vh-84px)] lg:flex-row lg:overflow-hidden">
        <aside className="w-full border-b border-border/60 bg-intel-panel/60 backdrop-blur-md lg:w-72 lg:border-b-0 lg:border-r">
          <FilterPanel />
        </aside>

        <main className="h-[52vh] flex-1 p-4 lg:h-auto">
          <WorldMap selectedCountry={activeCountry} mapConnections={dashboard?.map_connections} />
        </main>

        <aside className="w-full p-4 pt-0 lg:w-[360px] lg:pl-0 lg:pt-4">
          <div className="intel-glass-shell flex h-full flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              <LiveEvents events={dashboard?.live_events} />
            </div>
            <div className="h-[42%] min-h-[280px] border-t border-border/60">
              <AIAssistant />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
