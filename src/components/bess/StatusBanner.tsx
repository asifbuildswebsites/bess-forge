import { useSyncExternalStore } from "react";
import { useBess } from "@/store/bess-store";
import { tariffAtHour, formatINR } from "@/lib/bess-calc";
import { Battery, CheckCircle2, AlertTriangle } from "lucide-react";

// Subscribe to the wall clock — runs on every page, ticks every minute.
const subscribeHour = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const getHourClient = () => new Date().getHours();
const getHourServer = () => null;

export function StatusBanner() {
  const { sizing, thermalResult, inputs, economics } = useBess();
  // Compute system status
  const npvNegative = economics.npv < 0;
  const thermalRisk = thermalResult.runawayRisk;
  const cRateHigh = sizing.cRate > 2;
  const status: "viable" | "marginal" | "risk" =
    thermalRisk || cRateHigh ? "risk" : npvNegative || sizing.cRate >= 1 ? "marginal" : "viable";

  const cfg = {
    viable: { color: "bg-pulse-green", text: "SYSTEM VIABLE", textColor: "text-pulse-green", Icon: CheckCircle2 },
    marginal: {
      color: "bg-pulse-amber",
      text: npvNegative ? "NEGATIVE NPV" : "REVIEW C-RATE",
      textColor: "text-pulse-amber",
      Icon: AlertTriangle,
    },
    risk: { color: "bg-pulse-red", text: thermalRisk ? "THERMAL RISK" : "HIGH C-RATE", textColor: "text-pulse-red", Icon: AlertTriangle },
  }[status];

  // Calculate power in MW and energy in MWh for the status badge
  const powerMW = (inputs.peakLoadKW / 1000).toFixed(1);
  const energyMWh = (sizing.nameplateKWh / 1000).toFixed(1);

  // SSR returns null → "—"; on client hydration this returns the real hour
  // immediately (no useEffect wait), then re-renders every minute.
  const hour = useSyncExternalStore(subscribeHour, getHourClient, getHourServer);
  const liveTariff = hour === null ? null : tariffAtHour(hour);

  // Derived, meaningful header metrics (no fake telemetry)
  const finalSoh = thermalResult.points[thermalResult.points.length - 1].soh;
  const StatusIcon = cfg.Icon;

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="px-4 py-4 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-pulse-cyan/35 bg-pulse-cyan/12 text-pulse-cyan glow-cyan">
              <Battery className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-foreground">BESS-Calc India</div>
              <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Battery Energy Storage Sizing &amp; Techno-Economic Calculator
              </div>
            </div>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 ${cfg.textColor} border-current/30 bg-current/10`}>
            <StatusIcon className="size-4" />
            <span className="data-cell text-xs font-bold uppercase tracking-widest">{cfg.text}</span>
            <span className="h-4 w-px bg-current/25" />
            <span className="data-cell text-[11px] font-semibold">
              {inputs.chemistry} · {powerMW}MW / {energyMWh}MWh
            </span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-border bg-panel/45 px-4 py-4 sm:grid-cols-2 lg:grid-cols-6 md:px-8">
        <SummaryMetric label="Nameplate" value={`${(sizing.nameplateKWh / 1000).toFixed(2)} MWh`} sub={`${powerMW} MW`} tone="text-pulse-cyan" />
        <SummaryMetric label="C-rate" value={`${sizing.cRate.toFixed(2)}C`} sub={sizing.cRate < 1 ? "Nominal" : "Review"} tone={sizing.cRate > 2 ? "text-pulse-red" : sizing.cRate >= 1 ? "text-pulse-amber" : "text-pulse-green"} />
        <SummaryMetric label="Live tariff" value={liveTariff === null ? "—" : `₹${liveTariff.toFixed(2)}`} sub="per kWh" tone={liveTariff !== null && liveTariff >= 7 ? "text-pulse-red" : "text-pulse-green"} />
        <SummaryMetric label="SOH @ EOL" value={`${finalSoh.toFixed(1)}%`} sub={`${thermalResult.eolYear ? `EOL yr ${thermalResult.eolYear}` : "15y horizon"}`} tone={finalSoh < 80 ? "text-pulse-amber" : "text-pulse-green"} />
        <SummaryMetric label="Annual savings" value={formatINR(economics.annualSavings)} sub="arbitrage + DCR" tone="text-pulse-green" />
        <SummaryMetric label="Payback / NPV" value={isFinite(economics.paybackYears) ? `${economics.paybackYears.toFixed(1)}y` : "N/A"} sub={formatINR(economics.npv)} tone={economics.npv >= 0 ? "text-pulse-green" : "text-pulse-amber"} />
      </div>
    </header>
  );
}

function SummaryMetric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="rounded-md border border-border bg-background/55 p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`data-cell mt-2 text-xl font-semibold ${tone}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
