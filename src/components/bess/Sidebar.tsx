import { useEffect, useState } from "react";
import { useBess } from "@/store/bess-store";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Chemistry, tariffAtHour } from "@/lib/bess-calc";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <label className="text-foreground/80">{label}</label>
        <span className="data-cell text-pulse-cyan">
          {value.toLocaleString("en-IN")} {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-foreground/80">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
          className="h-9 border-border bg-void data-cell text-pulse-cyan"
        />
        <span className="w-12 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SidebarControls() {
  const { inputs, setInputs, thermal, setThermal, economics } = useBess();
  const [liveTariff, setLiveTariff] = useState(() => tariffAtHour(0));
  const [durationOverridden, setDurationOverridden] = useState(false);
  const presetCellCapacity = [280, 314, 560].includes(inputs.cellCapacityAh)
    ? String(inputs.cellCapacityAh)
    : "custom";

  useEffect(() => {
    if (durationOverridden) return;
    const powerMW = inputs.peakLoadKW / 1000;
    const nextDuration = powerMW > 0 ? inputs.desiredEnergyMWh / powerMW : inputs.autonomyHours;
    if (Number.isFinite(nextDuration) && Math.abs(nextDuration - inputs.autonomyHours) > 0.01) {
      setInputs({ autonomyHours: Number(nextDuration.toFixed(2)) });
    }
  }, [inputs.desiredEnergyMWh, inputs.peakLoadKW, durationOverridden, inputs.autonomyHours, setInputs]);

  useEffect(() => {
    setLiveTariff(tariffAtHour(new Date().getHours()));
    const id = setInterval(() => {
      setLiveTariff(tariffAtHour(new Date().getHours()));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-pulse-cyan glow-cyan rounded-sm flex items-center justify-center text-void font-bold">
            B
          </div>
          <div>
            <h1 className="font-semibold tracking-tight text-sm">BESS-CALC INDIA</h1>
            <p className="text-[10px] text-muted-foreground data-cell tracking-widest">
              INTERACTIVE SIZING
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <section className="space-y-5">
          <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">
            Battery Sizing Calculator
          </h3>
          <div className="space-y-2">
            <label className="text-xs text-foreground/80">Battery Chemistry</label>
            <select
              value={inputs.chemistry}
              onChange={(event) => setInputs({ chemistry: event.target.value as Chemistry })}
              className="h-9 w-full border border-border bg-void px-3 text-xs data-cell text-pulse-cyan outline-none focus:border-pulse-cyan"
            >
              <option value="LFP">LFP (3.2V nominal)</option>
              <option value="NMC">NMC (3.6V nominal)</option>
              <option value="LTO">LTO (2.4V nominal)</option>
            </select>
          </div>
          <NumberField
            label="Desired Energy Capacity"
            unit="MWh"
            value={inputs.desiredEnergyMWh}
            onChange={(v) => setInputs({ desiredEnergyMWh: v })}
            min={0.5}
            max={20}
            step={0.1}
          />
          <NumberField
            label="Desired Power"
            unit="MW"
            value={inputs.peakLoadKW / 1000}
            onChange={(v) => setInputs({ peakLoadKW: Math.round(v * 1000) })}
            min={0.1}
            max={10}
            step={0.1}
          />
          <NumberField
            label="Discharge Duration"
            unit="hrs"
            value={inputs.autonomyHours}
            onChange={(v) => {
              setDurationOverridden(true);
              setInputs({ autonomyHours: v });
            }}
            min={0.05}
            max={200}
            step={0.1}
          />
          {durationOverridden && (
            <button
              type="button"
              onClick={() => setDurationOverridden(false)}
              className="data-cell text-[10px] uppercase tracking-wider text-pulse-cyan hover:text-foreground"
            >
              Re-enable auto duration
            </button>
          )}
          <SliderRow
            label="Depth of Discharge"
            unit="%"
            value={inputs.dodPct}
            onChange={(v) => setInputs({ dodPct: v })}
            min={50}
            max={100}
            step={1}
          />
          <SliderRow
            label="Round Trip Efficiency"
            unit="%"
            value={inputs.rteEffPct}
            onChange={(v) => setInputs({ rteEffPct: v })}
            min={80}
            max={95}
            step={1}
          />
          <NumberField
            label="Ambient Temperature"
            unit="°C"
            value={thermal.ambientC}
            onChange={(v) => setThermal({ ambientC: v })}
            min={-10}
            max={50}
            step={1}
          />
          <div className="space-y-2">
            <label className="text-xs text-foreground/80">Cell Capacity</label>
            <select
              value={presetCellCapacity}
              onChange={(event) => {
                if (event.target.value !== "custom") {
                  setInputs({ cellCapacityAh: Number(event.target.value) });
                }
              }}
              className="h-9 w-full border border-border bg-void px-3 text-xs data-cell text-pulse-cyan outline-none focus:border-pulse-cyan"
            >
              <option value="280">280 Ah</option>
              <option value="314">314 Ah</option>
              <option value="560">560 Ah</option>
              <option value="custom">Custom</option>
            </select>
            {presetCellCapacity === "custom" && (
              <Input
                type="number"
                value={inputs.cellCapacityAh}
                min={100}
                max={1000}
                step={1}
                onChange={(event) => setInputs({ cellCapacityAh: Number(event.target.value) })}
                className="h-9 border-border bg-void data-cell text-pulse-cyan"
              />
            )}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-border bg-void/40 space-y-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-pulse-green animate-pulse" />
          <span className="text-[10px] data-cell text-muted-foreground uppercase tracking-wider">
            Live Calc Engine Active
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] data-cell">
          <span className="text-muted-foreground uppercase tracking-wider">Nameplate</span>
          <span className="text-pulse-cyan text-right">{inputs.desiredEnergyMWh.toFixed(2)} MWh</span>

          <span className="text-muted-foreground uppercase tracking-wider">C-Rate</span>
          <span className="text-pulse-cyan text-right">
            {(inputs.peakLoadKW / (inputs.desiredEnergyMWh * 1000)).toFixed(2)}C
          </span>

          <span className="text-muted-foreground uppercase tracking-wider">Live Tariff</span>
          <span className="text-pulse-cyan text-right">₹{liveTariff.toFixed(2)}/kWh</span>

          <span className="text-muted-foreground uppercase tracking-wider">Arbitrage + DCR ₹</span>
          <span className="text-pulse-green text-right">
            {(() => {
              const n = economics.annualSavings;
              if (!isFinite(n)) return "—";
              const abs = Math.abs(n);
              return abs >= 1e5 ? `₹${(abs / 1e5).toFixed(2)} L` : `₹${(abs / 1000).toFixed(1)}k`;
            })()}
          </span>
        </div>
        <div className="pt-1 border-t border-border">
          <span className="text-[10px] data-cell text-pulse-green uppercase tracking-wider">
            {inputs.chemistry} / {inputs.cellCapacityAh.toLocaleString("en-IN")}Ah / {inputs.peakLoadKW.toLocaleString("en-IN")}kW
          </span>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside
      suppressHydrationWarning
      className="hidden w-80 max-w-80 shrink-0 border-r border-border bg-panel md:flex flex-col h-screen sticky top-0"
    >
      <SidebarControls />
    </aside>
  );
}

export function MobileSettingsPanel() {
  return <SidebarControls />;
}
