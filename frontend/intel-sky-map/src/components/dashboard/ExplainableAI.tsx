import { X, ExternalLink, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export interface ExplainableData {
  title: string;
  keyFactors: string[];
  chain: string[];
  confidence: number;
  sources: { name: string; url: string; timestamp: string; reliability: string }[];
}

interface ExplainableAIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ExplainableData | null;
  onTraceReasoning?: () => void;
}

const riskScoreExplain: ExplainableData = {
  title: "Global Risk Score: 8.5 / 10",
  keyFactors: [
    "Border military activity surged 34% in 72 hrs",
    "Energy corridor disruption probability at 67%",
    "Diplomatic channels showing reduced engagement",
    "Regional alliance realignment signals detected",
  ],
  chain: [
    "Border Escalation",
    "Oil Supply Disruption",
    "Energy Price Increase",
    "Inflation Pressure",
    "Economic Instability",
  ],
  confidence: 78,
  sources: [
    { name: "OSINT Satellite Feed", url: "#", timestamp: "2026-03-25 08:14 UTC", reliability: "High" },
    { name: "Reuters Geopolitical Wire", url: "#", timestamp: "2026-03-25 07:30 UTC", reliability: "Verified" },
    { name: "IMF Energy Monitor", url: "#", timestamp: "2026-03-24 22:00 UTC", reliability: "High" },
  ],
};

export { riskScoreExplain };

const ExplainableAI = ({ open, onOpenChange, data, onTraceReasoning }: ExplainableAIProps) => {
  if (!data) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-80 bg-[hsl(var(--surface))] border-l border-border p-0 overflow-y-auto scrollbar-thin"
      >
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[hsl(var(--coral))]" />
            <SheetTitle className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Why this insight?
            </SheetTitle>
          </div>
          <SheetDescription className="text-[11px] text-[hsl(var(--text-secondary))] mt-1">
            {data.title}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-5">
          {/* Key Factors */}
          <section>
            <h3 className="text-[9px] uppercase tracking-widest text-[hsl(var(--text-secondary))] font-semibold mb-2">
              🔑 Key Factors
            </h3>
            <ul className="space-y-1.5">
              {data.keyFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-foreground/85 leading-snug">
                  <span className="w-1 h-1 rounded-full bg-[hsl(var(--coral))] mt-1.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </section>

          {/* Reasoning Chain */}
          <section>
            <h3 className="text-[9px] uppercase tracking-widest text-[hsl(var(--text-secondary))] font-semibold mb-2">
              🔗 Reasoning Chain
            </h3>
            <div className="space-y-0">
              {data.chain.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--coral))] border border-[hsl(var(--coral-muted))]" />
                    {i < data.chain.length - 1 && (
                      <div className="w-px h-5 bg-[hsl(var(--border))]" />
                    )}
                  </div>
                  <span className="text-[11px] text-foreground/90 font-medium py-1">{step}</span>
                </div>
              ))}
            </div>
            {onTraceReasoning && (
              <button
                onClick={onTraceReasoning}
                className="mt-2.5 text-[10px] text-[hsl(var(--coral))] hover:text-[hsl(var(--coral))]/80 font-medium transition-colors"
              >
                Trace reasoning on graph →
              </button>
            )}
          </section>

          {/* Confidence */}
          <section>
            <h3 className="text-[9px] uppercase tracking-widest text-[hsl(var(--text-secondary))] font-semibold mb-2">
              📊 Confidence
            </h3>
            <div className="flex items-center gap-3">
              <Progress value={data.confidence} className="h-1.5 flex-1 bg-[hsl(var(--elevated))]" />
              <span className="text-sm font-bold text-[hsl(var(--coral))]">{data.confidence}%</span>
            </div>
          </section>

          {/* Sources */}
          <section>
            <h3 className="text-[9px] uppercase tracking-widest text-[hsl(var(--text-secondary))] font-semibold mb-2">
              📚 Sources
            </h3>
            <div className="space-y-2">
              {data.sources.map((s, i) => (
                <div key={i} className="rounded-md border border-border bg-[hsl(var(--elevated))] p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-foreground">{s.name}</span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--coral))] hover:text-[hsl(var(--coral))]/80"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-[hsl(var(--text-secondary))]">
                    <span>{s.timestamp}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-[hsl(var(--status-online))]/15 text-[hsl(var(--status-online))] font-semibold">
                      {s.reliability}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExplainableAI;
