import { Globe } from "lucide-react";
import FilterPanel from "@/components/dashboard/FilterPanel";
import WorldMap from "@/components/dashboard/WorldMap";
import NewsPanel from "@/components/news/NewsPanel";
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

      <div className="relative z-10 h-[calc(100vh-138px)] overflow-auto lg:h-[calc(100vh-84px)]">
        <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-5">
          <aside className="order-2 border border-border/60 bg-intel-panel/60 backdrop-blur-md lg:order-1 lg:col-span-2 lg:rounded-2xl">
          <FilterPanel />
          </aside>

          <main className="order-1 flex min-h-[56vh] flex-col gap-4 lg:order-2 lg:col-span-10 lg:min-h-0">
            <section className="relative min-h-[380px] flex-1 lg:min-h-0">
              <WorldMap selectedCountry={activeCountry} mapConnections={dashboard?.map_connections} />
              <div className="absolute inset-y-4 right-4 z-20 w-full max-w-[420px] lg:w-1/3">
                <NewsPanel />
              </div>
            </section>

            <div className="intel-glass-shell h-[320px] overflow-hidden">
              <AIAssistant />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
