import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { ArrowLeft, Globe } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useAnalysisData } from "@/hooks/useBackendData";

const riskDrivers = ["Geopolitical", "Economic", "Technological", "Defense", "Climate", "Social"];

const Analysis = () => {
  const navigate = useNavigate();
  const { selectedCountry } = useIntelligence();
  const { data: analysisData } = useAnalysisData(selectedCountry);

  const [prompt, setPrompt] = useState("Generate deep-dive analysis based on current global risk signals and cross-domain dependencies.");

  const chartSeries = useMemo(() => {
    const timeline = analysisData?.risk_timeline ?? [];
    const fallback = [24, 20, 34, 26, 41, 28];

    if (timeline.length === 0) {
      return fallback.map((value, idx) => ({
        month: ["Jan 24", "May 24", "Jun 24", "Jul 24", "Sep 24", "Dec 24"][idx],
        geopolitical: value,
        economic: Math.max(10, value - 7),
      }));
    }

    const points = timeline.slice(-6);
    return points.map((point, idx) => {
      const date = new Date(point.date);
      const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const geo = Math.round(point.score * 10);
      return {
        month: label,
        geopolitical: geo,
        economic: Math.max(8, geo - (idx % 2 === 0 ? 7 : -4)),
      };
    });
  }, [analysisData?.risk_timeline]);

  const radarData = useMemo(
    () =>
      riskDrivers.map((name, idx) => ({
        driver: name,
        current: Math.max(22, 76 - idx * 8),
        economic: Math.max(18, 58 - idx * 6),
      })),
    []
  );

  const tableRows = useMemo(() => {
    const recommendations = analysisData?.policy_recommendations ?? [];
    if (recommendations.length === 0) {
      return [];
    }

    const region = selectedCountry;
    return recommendations.slice(0, 5).map((section, idx) => ({
      riskFactor: riskDrivers[idx] ?? "Geopolitical",
      region,
      riskScore: Math.max(20, 71 - idx * 9),
      driver: section.title,
      summary: section.items[0] ?? "Monitoring strategic posture and escalation signals.",
      action: section.items[1] ?? "Update contingency action plan.",
    }));
  }, [analysisData?.policy_recommendations, selectedCountry]);

  const generatedNotes = useMemo(() => {
    const src = analysisData?.source_citations ?? [];
    if (src.length === 0) {
      return [
        `AI Analysis: ${selectedCountry} remains a primary concern due to compounded geopolitical and economic stressors.`,
        "AI Analysis: Scenario modeling recommends accelerated diplomatic and supply-chain coordination.",
      ];
    }

    return src.slice(0, 4).map((s) => `AI Analysis: ${s.name} indicates elevated volatility with reliability at ${s.reliability}%.`);
  }, [analysisData?.source_citations, selectedCountry]);

  return (
    <div className="relative h-screen overflow-hidden bg-intel-canvas text-foreground">
      <div className="pointer-events-none absolute inset-0 intel-gradient" />

      <header className="relative z-10 border-b border-border/60 px-4 py-4 backdrop-blur-sm lg:px-6 lg:py-5">
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-md bg-coral/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Globe className="h-6 w-6 text-coral lg:h-7 lg:w-7" />
          <h1 className="text-2xl font-semibold uppercase tracking-[0.02em] text-white sm:text-3xl lg:text-5xl">Global Risk Insights & Analysis</h1>
        </div>
      </header>

      <main className="relative z-10 h-[calc(100vh-150px)] overflow-auto p-4 lg:h-[calc(100vh-180px)] lg:overflow-hidden lg:p-5">
        <div className="grid min-h-full grid-cols-1 gap-3 xl:h-full xl:grid-cols-12">
          <section className="intel-panel flex min-h-[300px] flex-col p-4 xl:col-span-5 xl:min-h-0">
            <h2 className="intel-section-title">Risk Score Trends (last 6 months)</h2>
            <div className="mt-2 min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSeries} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(13, 18, 27, 0.95)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: "10px",
                      color: "#e5e7eb",
                    }}
                  />
                  <Line type="monotone" dataKey="geopolitical" stroke="#ef4444" strokeWidth={2.4} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="economic" stroke="#60a5fa" strokeWidth={2.4} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="intel-panel flex min-h-[300px] flex-col p-4 xl:col-span-4 xl:min-h-0">
            <h2 className="intel-section-title">Risk Driver Comparison</h2>
            <div className="mt-2 min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.16)" />
                  <PolarAngleAxis dataKey="driver" tick={{ fill: "#d1d5db", fontSize: 12 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="Current" dataKey="current" stroke="#ef4444" fill="#ef4444" fillOpacity={0.22} />
                  <Radar name="Economic" dataKey="economic" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.24} />
                  <Legend wrapperStyle={{ color: "#d1d5db", fontSize: "12px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="intel-panel flex min-h-[420px] flex-col p-4 xl:col-span-3 xl:min-h-0">
            <h2 className="intel-section-title">AI Deep-Dive Analysis</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2 h-28 rounded-lg border border-border/70 bg-accent/50 p-3 text-sm text-foreground outline-none focus:border-coral/60"
            />
            <button className="mt-3 self-end rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-muted">
              Generate Analysis
            </button>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60 bg-accent/30 p-3 scrollbar-thin">
              {generatedNotes.map((note, idx) => (
                <p key={idx} className="mb-3 text-sm leading-relaxed text-foreground/90">
                  {note}
                </p>
              ))}
            </div>
          </section>

          <section className="intel-panel min-h-[320px] p-4 xl:col-span-12 xl:min-h-0">
            <h2 className="intel-section-title mb-3">Risk Analysis & Mitigation</h2>
            <div className="h-[calc(100%-30px)] overflow-auto scrollbar-thin">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 text-left text-text-secondary">
                    <th className="px-3 py-2 font-semibold">Risk Factor</th>
                    <th className="px-3 py-2 font-semibold">Region</th>
                    <th className="px-3 py-2 font-semibold">Risk Score</th>
                    <th className="px-3 py-2 font-semibold">Driver</th>
                    <th className="px-3 py-2 font-semibold">Analysis Summary</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr key={idx} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground/90">{row.riskFactor}</td>
                      <td className="px-3 py-2 text-foreground/90">{row.region}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-coral/20 px-2 py-1 font-semibold text-coral">{row.riskScore}</span>
                      </td>
                      <td className="px-3 py-2 text-foreground/90">{row.driver}</td>
                      <td className="px-3 py-2 text-foreground/80">{row.summary}</td>
                      <td className="px-3 py-2 text-foreground/90">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Analysis;

