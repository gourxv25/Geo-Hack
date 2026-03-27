import { AlertTriangle } from "lucide-react";

interface AlertStripProps {
  alerts?: string[];
}

const AlertStrip = ({ alerts = [] }: AlertStripProps) => {
  const tickerAlerts = alerts.length > 0 ? alerts : ["No active alert signals"];
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-coral/10 border border-coral/20 overflow-hidden">
      <AlertTriangle className="w-3.5 h-3.5 text-coral flex-shrink-0" />
      <div className="flex-1 overflow-hidden relative">
        <div className="animate-ticker flex whitespace-nowrap">
          {[...tickerAlerts, ...tickerAlerts].map((alert, i) => (
            <span key={i} className="text-xs text-coral font-medium mx-8">
              {alert}
            </span>
          ))}
        </div>
      </div>
      <span className="ml-auto text-[10px] text-coral-muted whitespace-nowrap flex-shrink-0">LIVE</span>
    </div>
  );
};

export default AlertStrip;
