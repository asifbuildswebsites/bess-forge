import { BatteryWarning, Calculator, Settings, Zap } from "lucide-react";
import { useBess } from "@/store/bess-store";

const DEMO_VALUES = {
  chemistry: "LFP" as const,
  desiredEnergyMWh: 4,
  peakLoadKW: 1000,
  autonomyHours: 4,
  dodPct: 90,
  rteEffPct: 92,
  cellCapacityAh: 280,
  parallelStrings: 22,
  ambientC: 35,
  dailyCycles: 1.2,
  years: 15,
};

interface EmptyStateProps {
  onLoadDemo?: () => void;
}

export function EmptyState({ onLoadDemo }: EmptyStateProps) {
  const { setInputs, setThermal } = useBess();

  const handleLoadDemo = () => {
    setInputs({
      chemistry: DEMO_VALUES.chemistry,
      desiredEnergyMWh: DEMO_VALUES.desiredEnergyMWh,
      peakLoadKW: DEMO_VALUES.peakLoadKW,
      autonomyHours: DEMO_VALUES.autonomyHours,
      dodPct: DEMO_VALUES.dodPct,
      rteEffPct: DEMO_VALUES.rteEffPct,
      cellCapacityAh: DEMO_VALUES.cellCapacityAh,
      parallelStrings: DEMO_VALUES.parallelStrings,
    });
    setThermal({
      ambientC: DEMO_VALUES.ambientC,
      dailyCycles: DEMO_VALUES.dailyCycles,
      years: DEMO_VALUES.years,
    });
    onLoadDemo?.();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center max-w-md animate-fade-in">
        {/* Icon illustration */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="relative">
            <BatteryWarning className="size-16 text-pulse-cyan/80" />
            <div className="absolute -top-1 -right-1 size-4 bg-pulse-cyan/20 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center">
            <div className="h-px w-8 bg-pulse-cyan/30" />
          </div>
          <div className="relative">
            <Calculator className="size-16 text-pulse-amber/80" />
            <div className="absolute -bottom-1 -left-1 size-3 bg-pulse-amber/20 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center">
            <div className="h-px w-8 bg-pulse-cyan/30" />
          </div>
          <div className="relative">
            <Settings className="size-16 text-pulse-green/80" />
            <div className="absolute -top-1 -right-2 size-3 bg-pulse-green/20 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          BESS-Calc India
        </h2>
        <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
          Battery Energy Storage System sizing and techno-economic analysis
          tool for the Indian grid.
        </p>
        <p className="text-muted-foreground/70 text-sm mb-8">
          Enter your system requirements in the sidebar to begin battery sizing.
        </p>

        {/* Demo button */}
        <button
          type="button"
          onClick={handleLoadDemo}
          className="inline-flex items-center gap-2 px-6 py-3 bg-pulse-cyan text-void font-semibold rounded-sm hover:opacity-90 transition-opacity animate-pulse"
        >
          <Zap className="size-4" />
          Load Example: 1MW / 4MWh LFP System
        </button>

        {/* Features list */}
        <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-muted-foreground/60">
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-pulse-cyan" />
            <span>LFP / NMC / LTO chemistry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-pulse-green" />
            <span>Thermal degradation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-pulse-amber" />
            <span>ToD tariff analysis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-fiber-violet" />
            <span>Grid compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
}