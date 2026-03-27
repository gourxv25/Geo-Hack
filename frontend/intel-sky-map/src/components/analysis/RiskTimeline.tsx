import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { TrendingUp, FileText } from "lucide-react";
import { useIntelligence } from "@/context/IntelligenceContext";
import { useAnalysisData } from "@/hooks/useBackendData";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-text-secondary">{d.date}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">
        Risk: <span className="text-coral">{d.score}</span>
      </p>
      {d.event && <p className="text-[10px] text-coral mt-1 max-w-[180px]">{d.event}</p>}
    </div>
  );
};

const RiskTimeline = () => {
  const [showExport, setShowExport] = useState(false);
  const { selectedCountry } = useIntelligence();
  const { data } = useAnalysisData(selectedCountry);

  const timeline = (data?.risk_timeline ?? []).map((row) => ({
      day: row.day,
      date: row.date,
      score: row.score,
      event: row.event ?? null,
    }));

  return (
    <div className="bg-surface border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-coral" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">30-Day Risk Timeline</h3>
        </div>
        <button onClick={() => setShowExport(!showExport)} className="flex items-center gap-1.5 text-[10px] text-text-secondary hover:text-coral transition-colors">
          <FileText className="w-3 h-3" />
          Export Brief
        </button>
      </div>
      {showExport && (
        <div className="mx-4 mt-3 p-3 bg-accent rounded-lg border border-border">
          <p className="text-[11px] text-foreground font-medium mb-2">Generate Intelligence Brief</p>
          <p className="text-[10px] text-text-secondary mb-3">Export includes AI analysis, policy recommendations, source citations, and risk data.</p>
          <div className="flex gap-2">
            <button className="text-[10px] px-3 py-1.5 rounded bg-coral text-foreground font-medium hover:bg-coral-muted transition-colors">Export as PDF</button>
            <button className="text-[10px] px-3 py-1.5 rounded bg-elevated text-text-secondary hover:text-foreground transition-colors">Save to History</button>
          </div>
        </div>
      )}
      <div className="px-2 py-3 h-[180px]">
        {timeline.length === 0 && <div className="text-xs text-text-secondary px-2">No timeline data available.</div>}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={{ top: 5, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(8, 72%, 65%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(8, 72%, 65%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(216, 14%, 68%)" }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[5, 10]} tick={{ fontSize: 9, fill: "hsl(216, 14%, 68%)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {timeline
              .filter((d) => d.event)
              .map((d, i) => (
                <ReferenceLine key={i} x={d.date} stroke="hsl(8, 72%, 65%)" strokeDasharray="3 3" strokeOpacity={0.4} />
              ))}
            <Area type="monotone" dataKey="score" stroke="hsl(8, 72%, 65%)" strokeWidth={2} fill="url(#riskGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RiskTimeline;
