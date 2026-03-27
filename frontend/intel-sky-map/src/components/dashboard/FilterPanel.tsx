import { Shield, TrendingUp, Cpu, Crosshair, CloudRain } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";

const domains = [
  { id: "geopolitical", label: "Geopolitical", icon: Shield },
  { id: "economic", label: "Economic", icon: TrendingUp },
  { id: "technological", label: "Technological", icon: Cpu },
  { id: "defense", label: "Defense", icon: Crosshair },
  { id: "climate", label: "Climate", icon: CloudRain },
  { id: "cyber", label: "Cyber", icon: Shield },
];

const FilterPanel = () => {
  const { activeFilters, setActiveFilters } = useIntelligence();

  const toggle = (id: string) => {
    setActiveFilters(activeFilters.includes(id) ? activeFilters.filter((d) => d !== id) : [...activeFilters, id]);
  };

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-[0.16em] text-text-secondary sm:text-base">Intelligence</h2>
        <p className="mt-1 text-2xl font-medium text-white sm:text-3xl">Domains</p>
      </div>

      <div className="space-y-2">
        {domains.map((domain) => {
          const active = activeFilters.includes(domain.id);
          return (
            <button
              key={domain.id}
              onClick={() => toggle(domain.id)}
              className={`group relative flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-coral/45 bg-coral/12 text-white shadow-[0_0_14px_rgba(255,92,63,0.25)]"
                  : "border-transparent text-text-secondary hover:border-border/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <domain.icon className={`h-4 w-4 ${active ? "text-coral" : "text-text-secondary group-hover:text-white"}`} />
              <span className="text-lg font-medium tracking-tight sm:text-xl">{domain.label}</span>
              {active && <span className="ml-auto h-3 w-3 rounded bg-coral shadow-[0_0_10px_rgba(255,92,63,0.75)]" />}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6">
        <button className="w-full rounded-2xl border border-coral/70 bg-coral/20 px-4 py-3 text-xl font-semibold tracking-tight text-white shadow-[0_0_18px_rgba(255,122,64,0.42)] transition hover:bg-coral/30 sm:text-2xl">
          FULL INSIGHTS
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
