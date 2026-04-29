import { useEffect, useState } from "react";
import { useBess } from "@/store/bess-store";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Chemistry, tariffAtHour } from "@/lib/bess-calc";

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

export function Sidebar() {
  const { inputs, setInputs, thermal, setThermal, economics } = useBess();
  const [liveTariff, setLiveTariff] = useState(() => tariffAtHour(new Date().getHours()));
  useEffect(() => {
    setLiveTariff(tariffAtHour(new Date().getHours()));
    const id = setInterval(() => {
      setLiveTariff(tariffAtHour(new Date().getHours()));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-80 shrink-0 border-r border-border bg-panel flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-pulse-cyan glow-cyan rounded-sm flex items-center justify-center text-void font-bold">
            B
          </div>
          <div>
            <h1 className="font-semibold tracking-tight text-sm">BESS-CALC INDIA</h1>
            <p className="text-[10px] text-muted-foreground data-cell tracking-widest">V.1.0 / GRID-IN</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-7">
        <section className="space-y-5">
          <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">
            Sizing Parameters
          </h3>
          <SliderRow
            label="Peak Load"
            unit="kW"
            value={inputs.peakLoadKW}
            onChange={(v) => setInputs({ peakLoadKW: v })}
            min={10}
            max={10000}
            step={10}
          />
          <SliderRow
            label="Autonomy"
            unit="hrs"
            value={inputs.autonomyHours}
            onChange={(v) => setInputs({ autonomyHours: v })}
            min={0.5}
            max={8}
            step={0.5}
          />
          <SliderRow
            label="Solar PV"
            unit="kWp"
            value={inputs.solarKWp}
            onChange={(v) => setInputs({ solarKWp: v })}
            min={0}
            max={5000}
            step={50}
          />
          <SliderRow
            label="DOD"
            unit="%"
            value={inputs.dodPct}
            onChange={(v) => setInputs({ dodPct: v })}
            min={70}
            max={95}
            step={1}
          />
          <SliderRow
            label="Round-Trip Eff"
            unit="%"
            value={inputs.rteEffPct}
            onChange={(v) => setInputs({ rteEffPct: v })}
            min={85}
            max={98}
            step={1}
          />
        </section>

        <section className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">
            Cell Chemistry
          </h3>
          <Select
            value={inputs.chemistry}
            onValueChange={(v) => setInputs({ chemistry: v as Chemistry })}
          >
            <SelectTrigger className="bg-void border-border data-cell text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-panel border-border">
              <SelectItem value="LFP">LFP — Lithium Iron Phosphate</SelectItem>
              <SelectItem value="NMC">NMC — Nickel Manganese Cobalt</SelectItem>
              <SelectItem value="NCA">NCA — Nickel Cobalt Aluminium</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-5 pt-2 border-t border-border">
          <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">
            Thermal & Operations
          </h3>
          <SliderRow
            label="Ambient Temp"
            unit="°C"
            value={thermal.ambientC}
            onChange={(v) => setThermal({ ambientC: v })}
            min={15}
            max={50}
            step={1}
          />
          <SliderRow
            label="Daily Cycles"
            unit="cyc"
            value={thermal.dailyCycles}
            onChange={(v) => setThermal({ dailyCycles: v })}
            min={0.5}
            max={2}
            step={0.1}
          />
          <SliderRow
            label="Operating Years"
            unit="yr"
            value={thermal.years}
            onChange={(v) => setThermal({ years: v })}
            min={1}
            max={20}
            step={1}
          />
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
          <span className="text-pulse-cyan text-right">{(inputs.peakLoadKW * inputs.autonomyHours / ((inputs.dodPct / 100) * (inputs.rteEffPct / 100)) / 1000).toFixed(2)} MWh</span>

          <span className="text-muted-foreground uppercase tracking-wider">C-Rate</span>
          <span className="text-pulse-cyan text-right">{(inputs.peakLoadKW / (inputs.peakLoadKW * inputs.autonomyHours / ((inputs.dodPct / 100) * (inputs.rteEffPct / 100)))).toFixed(2)}C</span>

          <span className="text-muted-foreground uppercase tracking-wider">Live Tariff</span>
          <span className="text-pulse-cyan text-right">₹{liveTariff.toFixed(2)}/kWh</span>

          <span className="text-muted-foreground uppercase tracking-wider">SOH @ EoL</span>
          <span className="text-pulse-cyan text-right">80.0%</span>

          <span className="text-muted-foreground uppercase tracking-wider">Arbitrage + DCR ₹</span>
          <span className="text-pulse-green text-right">{
            (() => {
              const n = economics.annualSavings;
              if (!isFinite(n)) return "—";
              const abs = Math.abs(n);
              return abs >= 1e5 ? `₹${(abs / 1e5).toFixed(2)} L` : `₹${(abs / 1000).toFixed(1)}k`;
            })()
          }</span>
        </div>
        <div className="pt-1 border-t border-border">
          <span className="text-[10px] data-cell text-pulse-green uppercase tracking-wider">
            SYSTEM VIABLE / {inputs.chemistry} @ {inputs.peakLoadKW.toLocaleString("en-IN")}kW
          </span>
        </div>
      </div>
    </aside>
  );
}
