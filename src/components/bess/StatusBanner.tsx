import { useSyncExternalStore } from "react";
import { useBess } from "@/store/bess-store";
import { tariffAtHour, formatINR } from "@/lib/bess-calc";
import { Battery } from "lucide-react";

// Subscribe to the wall clock — runs on every page, ticks every minute.
const subscribeHour = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const getHourClient = () => new Date().getHours();
const getHourServer = () => null;

// Chemistry color mapping for status badge
const chemistryColors: Record<string, { bg: string; text: string; border: string }> = {
  LFP: { bg: "bg-teal-600", text: "text-teal-100", border: "border-teal-500" },
  NMC: { bg: "bg-amber-600", text: "text-amber-100", border: "border-amber-500" },
  LTO: { bg: "bg-blue-600", text: "text-blue-100", border: "border-blue-500" },
};

export function StatusBanner() {
  const { sizing, thermalResult, inputs, economics } = useBess();
  // Compute system status
  const thermalRisk = thermalResult.runawayRisk;
  const cRateHigh = sizing.cRate > 2;
  const status: "viable" | "marginal" | "risk" = thermalRisk
    ? "risk"
    : cRateHigh || sizing.cRate >= 1
      ? "marginal"
      : "viable";

  const cfg = {
    viable: { color: "bg-pulse-green", text: "SYSTEM VIABLE", textColor: "text-pulse-green" },
    marginal: {
      color: "bg-pulse-amber",
      text: "MARGINAL — REVIEW C-RATE",
      textColor: "text-pulse-amber",
    },
    risk: { color: "bg-pulse-red", text: "THERMAL RUNAWAY RISK", textColor: "text-pulse-red" },
  }[status];

  // Get chemistry color configuration
  const chemColor = chemistryColors[inputs.chemistry] || chemistryColors.LFP;

  // Calculate power in MW and energy in MWh for the status badge
  const powerMW = (inputs.peakLoadKW / 1000).toFixed(1);
  const energyMWh = (sizing.nameplateKWh / 1000).toFixed(1);

  // SSR returns null → "—"; on client hydration this returns the real hour
  // immediately (no useEffect wait), then re-renders every minute.
  const hour = useSyncExternalStore(subscribeHour, getHourClient, getHourServer);
  const liveTariff = hour === null ? null : tariffAtHour(hour);

  // Derived, meaningful header metrics (no fake telemetry)
  const finalSoh = thermalResult.points[thermalResult.points.length - 1].soh;

  return (
    <header className="sticky top-0 z-50 shrink-0">
      {/* Top Navigation Bar */}
      <div className="bg-slate-900 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left: App Name with Battery Icon */}
          <div className="flex items-center gap-2">
            <Battery className="size-5 text-white" />
            <span className="text-base font-bold text-white">BESS-Calc India</span>
          </div>

          {/* Right: Color-coded Status Badge */}
          <div
            className={`flex items-center gap-2 rounded px-3 py-1.5 ${chemColor.bg} ${chemColor.border} border`}
          >
            <div
              className={`size-2 rounded-full ${cfg.color} animate-pulse`}
            />
            <span className={`text-xs font-semibold ${chemColor.text}`}>
              System: {inputs.chemistry} | {powerMW}MW / {energyMWh}MWh
            </span>
          </div>
        </div>
      </div>

      {/* Subtitle Bar */}
      <div className="border-b border-border bg-panel/30 px-4 py-2 md:px-6">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Battery Storage Sizing & Techno-Economics
        </span>
      </div>

      {/* Metrics Bar */}
      <div className="min-h-14 overflow-hidden border-b border-border bg-panel/50 px-4 py-3 md:px-6">
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
                sizing.cRate > 2
                  ? "text-pulse-red"
                  : sizing.cRate >= 1
                    ? "text-pulse-amber"
                    : "text-pulse-green"
              }`}
            >
              {sizing.cRate.toFixed(2)}C
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">
              Live Tariff
            </span>
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
                finalSoh < 70
                  ? "text-pulse-red"
                  : finalSoh < 80
                    ? "text-pulse-amber"
                    : "text-pulse-green"
              }`}
            >
              {finalSoh.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">
              Arbitrage + DCR ₹
            </span>
            <span className="data-cell text-sm text-foreground">
              {formatINR(economics.annualSavings)}
            </span>
          </div>
          {economics.replacementYear && (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase">Replace</span>
              <span className="data-cell text-sm text-pulse-amber">
                Yr {economics.replacementYear}
              </span>
            </div>
          )}
        </div>

        {/* Status Indicator (desktop only) */}
        <div
          className={`hidden shrink-0 items-center gap-3 md:flex ${cfg.textColor}`}
        >
          <span
            className={`text-[10px] data-cell font-bold uppercase tracking-widest ${cfg.textColor}`}
          >
            {cfg.text}
          </span>
        </div>
      </div>
    </div>
    </header>
  );
}
