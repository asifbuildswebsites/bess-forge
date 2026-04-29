import { useSyncExternalStore } from "react";
import { useBess } from "@/store/bess-store";
import { tariffAtHour, formatINR } from "@/lib/bess-calc";

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
  const thermalRisk = thermalResult.runawayRisk;
  const cRateHigh = sizing.cRate > 1.5;
  const status: "viable" | "marginal" | "risk" = thermalRisk
    ? "risk"
    : cRateHigh || sizing.cRate > 1.2
      ? "marginal"
      : "viable";

  const cfg = {
    viable: { color: "bg-pulse-green", text: "SYSTEM VIABLE", textColor: "text-pulse-green" },
    marginal: { color: "bg-pulse-amber", text: "MARGINAL — REVIEW C-RATE", textColor: "text-pulse-amber" },
    risk: { color: "bg-pulse-red", text: "THERMAL RUNAWAY RISK", textColor: "text-pulse-red" },
  }[status];

  // SSR returns null → "—"; on client hydration this returns the real hour
  // immediately (no useEffect wait), then re-renders every minute.
  const hour = useSyncExternalStore(subscribeHour, getHourClient, getHourServer);
  const liveTariff = hour === null ? null : tariffAtHour(hour);

  // Derived, meaningful header metrics (no fake telemetry)
  const finalSoh = thermalResult.points[thermalResult.points.length - 1].soh;

  return (
    <header className="min-h-14 shrink-0 overflow-hidden border-b border-border bg-panel/50 px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:gap-7 [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Nameplate</span>
          <span className="data-cell text-sm text-pulse-cyan">
            {(sizing.nameplateKWh / 1000).toFixed(2)} MWh
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase">C-Rate</span>
          <span
            className={`data-cell text-sm ${
              sizing.cRate > 1.5
                ? "text-pulse-red"
                : sizing.cRate > 1
                  ? "text-pulse-amber"
                  : "text-pulse-green"
            }`}
          >
            {sizing.cRate.toFixed(2)}C
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Live Tariff</span>
          <span
            className={`data-cell text-sm ${
              liveTariff === null
                ? "text-muted-foreground"
                : liveTariff >= 7
                  ? "text-pulse-red"
                  : liveTariff >= 5.5
                    ? "text-pulse-amber"
                    : "text-pulse-green"
            }`}
          >
            {liveTariff === null ? "—" : `₹${liveTariff.toFixed(2)}/kWh`}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase">SOH @ EoL</span>
          <span
            className={`data-cell text-sm ${
              finalSoh < 70 ? "text-pulse-red" : finalSoh < 80 ? "text-pulse-amber" : "text-pulse-green"
            }`}
          >
            {finalSoh.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Arbitrage + DCR ₹</span>
          <span className="data-cell text-sm text-foreground">
            {formatINR(economics.annualSavings)}
          </span>
        </div>
          {economics.replacementYear && (
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Replace</span>
            <span className="data-cell text-sm text-pulse-amber">Yr {economics.replacementYear}</span>
          </div>
          )}
        </div>

      <div className={`hidden shrink-0 items-center gap-3 border px-3 py-1.5 md:flex ${cfg.textColor} border-current/30`}>
        <div className={`size-2 rounded-full ${cfg.color} animate-pulse`} />
        <span className={`text-[10px] data-cell font-bold uppercase tracking-widest ${cfg.textColor}`}>
          {cfg.text}
        </span>
        <span className="text-[10px] text-muted-foreground data-cell">
          / {inputs.chemistry} @ {inputs.peakLoadKW}kW
        </span>
      </div>
      </div>
    </header>
  );
}
