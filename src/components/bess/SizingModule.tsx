import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { formatNum } from "@/lib/bess-calc";
import type { ReactNode } from "react";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function SizingModule() {
  const { sizing, inputs, setInputs, thermal } = useBess();
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const rackSeriesCells = 250;
  const rackParallelStrings = inputs.parallelStrings;
  const isHot = thermal.ambientC >= 45 || sizing.cRate > 2;
  const isWarm = !isHot && (thermal.ambientC >= 42 || sizing.cRate >= 1);
  const cellTone = isHot
    ? "border-pulse-red/60 bg-pulse-red/30 text-pulse-red"
    : isWarm
      ? "border-pulse-amber/60 bg-pulse-amber/25 text-pulse-amber"
      : "border-pulse-cyan/55 bg-pulse-cyan/18 text-pulse-cyan";
  const selectedCellTone = isHot
    ? "ring-pulse-red bg-pulse-red/55"
    : isWarm
      ? "ring-pulse-amber bg-pulse-amber/50"
      : "ring-pulse-cyan bg-pulse-cyan/45";
  const chemistryVoltage = inputs.chemistry === "LFP" ? 3.2 : inputs.chemistry === "NMC" ? 3.6 : 2.4;
  const nominalStringVoltage = rackSeriesCells * chemistryVoltage;
  const capacityPerStringKWh = (nominalStringVoltage * inputs.cellCapacityAh) / 1000;
  const footprintScale = Math.max(0.28, Math.min(1, Math.sqrt(sizing.footprintM2 / 145)));
  const cRateStatus =
    sizing.cRate < 1
      ? { label: "C-rate < 1C", tone: "text-pulse-green border-pulse-green/40 bg-pulse-green/10", Icon: CheckCircle2 }
      : sizing.cRate <= 2
        ? { label: "C-rate 1–2C", tone: "text-pulse-amber border-pulse-amber/40 bg-pulse-amber/10", Icon: AlertTriangle }
        : { label: "C-rate > 2C", tone: "text-pulse-red border-pulse-red/40 bg-pulse-red/10", Icon: XCircle };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Battery Pack Sizing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Capacity, configuration & footprint for the chosen load profile.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Usable Capacity"
          value={formatNum(sizing.usableKWh, 0)}
          unit="kWh"
          variant="cyan"
          hint={`${inputs.desiredEnergyMWh.toFixed(1)} MWh × DOD × RTE`}
        />
        <MetricCard
          label="Nameplate Capacity"
          value={formatNum(sizing.nameplateKWh, 0)}
          unit="kWh"
          hint="Desired energy input"
        />
        <MetricCard
          label="C-Rate"
          value={sizing.cRate.toFixed(2)}
          unit="C"
          variant={sizing.cRate > 2 ? "red" : sizing.cRate >= 1 ? "amber" : "green"}
          hint={`${(inputs.peakLoadKW / 1000).toFixed(1)} MW / ${inputs.desiredEnergyMWh.toFixed(1)} MWh`}
        />
        <MetricCard
          label="Footprint Estimate"
          value={formatNum(sizing.footprintM2, 0)}
          unit="m²"
          variant="violet"
          hint="1.2 m² per rack/string"
        />
      </div>

      <div className={`inline-flex items-center gap-2 border px-3 py-2 text-xs ${cRateStatus.tone}`}>
        <cRateStatus.Icon className="size-4" />
        <span className="data-cell font-bold uppercase tracking-wider">{cRateStatus.label}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel border border-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
            Pack Configuration
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <Stat label="Cells in Series" value={formatNum(sizing.cellsSeries)} sub="@ 800V bus" />
            <Stat
              label="Parallel Strings"
              value={formatNum(sizing.parallelStrings)}
              sub={`${inputs.cellCapacityAh} Ah cells`}
            />
            <Stat label="Total Cells" value={formatNum(sizing.totalCells)} sub="approximate" />
          </div>

          <div className="mt-8 rounded-md border border-border bg-void/40 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Cells in Series: 250 @ 800V bus
              </div>
              <div className="data-cell text-[10px] text-pulse-cyan">
                Total Cells: {rackSeriesCells} × {rackParallelStrings} = {formatNum(rackSeriesCells * rackParallelStrings)}
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <label htmlFor="parallel-string-slider" className="text-foreground/80">
                  Parallel strings
                </label>
                <span className="data-cell text-pulse-cyan">{rackParallelStrings}</span>
              </div>
              <input
                id="parallel-string-slider"
                type="range"
                min={1}
                max={50}
                step={1}
                value={rackParallelStrings}
                onChange={(event) => setInputs({ parallelStrings: Number(event.target.value) })}
                className="w-full accent-pulse-cyan"
              />
            </div>
            <div
              className="grid max-h-[520px] overflow-auto rounded-sm border border-border bg-background/35 p-3 transition-all duration-300 chart-pan-zoom"
              style={{ gridTemplateColumns: `repeat(${rackParallelStrings}, minmax(20px, 50px))`, gap: "0.25rem" }}
            >
              {Array.from({ length: rackSeriesCells * rackParallelStrings }).map((_, i) => {
                const series = Math.floor(i / rackParallelStrings) + 1;
                const parallel = (i % rackParallelStrings) + 1;
                const id = `S${series} × P${parallel}`;
                const isSelected = selectedCell === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedCell(id)}
                    className={`aspect-square max-h-[50px] max-w-[50px] min-w-5 border text-[0px] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus:ring-1 ${cellTone} ${
                      isSelected ? `ring-1 ${selectedCellTone}` : ""
                    }`}
                    title={`${id} — ${isHot ? "Hot" : isWarm ? "Warm" : "Normal"}`}
                    aria-label={`${id} ${isHot ? "hot" : isWarm ? "warm" : "normal"}`}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 data-cell text-[10px] text-muted-foreground">
              <StatusDot className="bg-pulse-cyan" label="Normal" />
              <StatusDot className="bg-pulse-amber" label="Warm" />
              <StatusDot className="bg-pulse-red" label="Hot" />
              {selectedCell && <span className="text-foreground">Selected: {selectedCell}</span>}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.8fr]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <LegendItem label="Total cells" value={formatNum(sizing.totalCells)} />
                <LegendItem label="Voltage" value={`${formatNum(sizing.cellsSeries)} × ${chemistryVoltage}V = ${formatNum(nominalStringVoltage, 0)}V`} />
                <LegendItem
                  label="Capacity / string"
                  value={`${formatNum(capacityPerStringKWh, 0)} kWh`}
                />
              </div>
              <div className="rounded-sm border border-border bg-background/35 p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Footprint</span>
                  <span className="data-cell normal-case">145m² ref.</span>
                </div>
                <div className="flex h-16 items-end justify-center rounded-xs border border-dashed border-muted-foreground/35 p-2">
                  <div
                    className="rounded-xs border border-fiber-violet bg-fiber-violet/25"
                    style={{
                      width: `${footprintScale * 100}%`,
                      height: `${footprintScale * 100}%`,
                    }}
                    title={`${formatNum(sizing.footprintM2, 0)} m² footprint estimate`}
                  />
                </div>
                <div className="mt-2 data-cell text-[10px] text-fiber-violet">
                  {formatNum(sizing.footprintM2, 0)}m² estimated pad
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 data-cell">
            Visual: one representative rack; slider controls parallel string columns.
          </p>
        </div>

        <div className="bg-panel border border-border p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Validation Log
          </h3>
          <LogLine ts="00:00:01" color="text-pulse-cyan">
            Computed usable energy = {formatNum(sizing.usableKWh)} kWh
          </LogLine>
          <LogLine ts="00:00:02" color="text-foreground">
            Applied DOD {inputs.dodPct}% & RTE {inputs.rteEffPct}%
          </LogLine>
          <LogLine ts="00:00:03" color="text-foreground">
            Selected {inputs.chemistry} cells, {sizing.cellsSeries}s × {sizing.parallelStrings}p
          </LogLine>
          <LogLine ts="00:00:04" color={sizing.cRate > 1 ? "text-pulse-amber" : "text-pulse-green"}>
            C-rate {sizing.cRate.toFixed(2)} —{" "}
            {sizing.cRate > 1 ? "consider derating" : "within nominal"}
          </LogLine>
          <LogLine ts="00:00:05" color="text-pulse-green">
            Sizing complete. Ready for thermal analysis.
          </LogLine>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        {label}
      </div>
      <div className="data-cell text-2xl text-foreground mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 data-cell">{sub}</div>
    </div>
  );
}

function LegendItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/35 p-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="data-cell mt-1 text-xs text-foreground">{value}</div>
    </div>
  );
}

function LogLine({ ts, color, children }: { ts: string; color: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 text-[11px] data-cell leading-tight">
      <span className="text-muted-foreground/60">[{ts}]</span>
      <span className={color}>{children}</span>
    </div>
  );
}
