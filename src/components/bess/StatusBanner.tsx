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
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-panel/50 shrink-0">
      <div className="flex gap-7">
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

      <div className={`flex items-center gap-3 px-3 py-1.5 border ${cfg.textColor} border-current/30`}>
        <div className={`size-2 rounded-full ${cfg.color} animate-pulse`} />
        <span className={`text-[10px] data-cell font-bold uppercase tracking-widest ${cfg.textColor}`}>
          {cfg.text}
        </span>
        <span className="text-[10px] text-muted-foreground data-cell">
          / {inputs.chemistry} @ {inputs.peakLoadKW}kW
        </span>
      </div>
    </header>
  );
}
