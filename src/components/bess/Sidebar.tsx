import { useEffect, useState } from "react";
import { useBess } from "@/store/bess-store";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Chemistry } from "@/lib/bess-calc";

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
    <div className="space-y-3 rounded-md border border-border bg-background/35 p-3">
      <div className="flex justify-between text-xs">
        <label className="font-medium text-foreground/85">{label}</label>
        <span className="data-cell font-semibold text-pulse-cyan">
          {value.toLocaleString("en-IN")} {unit}
        </span>
      </div>
      <Slider
        className="py-1"
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

function InlineSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-foreground/80">{label}</label>
      <div className="grid gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`h-9 border px-3 text-left text-xs data-cell transition-colors ${
              value === option.value
                ? "border-pulse-cyan bg-pulse-cyan/12 text-pulse-cyan"
                : "border-border bg-void text-muted-foreground hover:border-pulse-cyan/50 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarControls() {
  const { inputs, setInputs, thermal, setThermal } = useBess();
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

  return (
    <>
      <div className="p-4 md:p-5 border-b border-border">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="size-8 md:size-9 bg-pulse-cyan glow-cyan rounded-sm flex items-center justify-center text-void font-bold shrink-0">
            B
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold tracking-tight text-xs md:text-sm truncate">Input Console</h1>
            <p className="text-[9px] md:text-[10px] text-muted-foreground data-cell tracking-widest hidden sm:block">
              INTERACTIVE SIZING
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">
            Battery Sizing Calculator
          </h3>
          <InlineSelect<Chemistry>
            label="Battery Chemistry"
            value={inputs.chemistry}
            onChange={(chemistry) => setInputs({ chemistry })}
            options={[
              { value: "LFP", label: "LFP (3.2V nominal)" },
              { value: "NMC", label: "NMC (3.6V nominal)" },
              { value: "LTO", label: "LTO (2.4V nominal)" },
            ]}
          />
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
              const powerMW = inputs.peakLoadKW / 1000;
              setDurationOverridden(true);
              setInputs({
                autonomyHours: v,
                desiredEnergyMWh: clamp(Number((powerMW * v).toFixed(2)), 0.5, 20),
              });
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
            <InlineSelect
              label="Cell Capacity"
              value={presetCellCapacity}
              onChange={(capacity) => {
                if (capacity !== "custom") {
                  setInputs({ cellCapacityAh: Number(capacity) });
                }
              }}
              options={[
                { value: "280", label: "280 Ah" },
                { value: "314", label: "314 Ah" },
                { value: "560", label: "560 Ah" },
                { value: "custom", label: "Custom" },
              ]}
            />
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

      <div className="border-t border-border bg-background/45 p-4">
        <span className="text-[10px] data-cell text-muted-foreground uppercase tracking-wider">
          Client-side calculations · no backend
        </span>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside
      suppressHydrationWarning
      className="hidden w-[300px] max-w-[300px] shrink-0 border-r border-border bg-panel/80 md:flex flex-col self-start sticky top-0 h-screen"
    >
      <SidebarControls />
    </aside>
  );
}

export function MobileSettingsPanel() {
  return <SidebarControls />;
}
