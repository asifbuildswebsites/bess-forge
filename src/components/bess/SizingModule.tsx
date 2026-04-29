import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { formatNum } from "@/lib/bess-calc";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function SizingModule() {
  const { sizing, inputs, thermal } = useBess();
  const visualSeriesSegments = 12;
  const visualParallelRows = Math.min(Math.max(sizing.parallelStrings, 2), 6);
  const cellsPerSeriesSegment = Math.ceil(sizing.cellsSeries / visualSeriesSegments);
  const isThermalBorderline = thermal.ambientC >= 42 || sizing.cRate > 1;
  const cellTone = isThermalBorderline
    ? "bg-pulse-amber/18 border-pulse-amber/55 text-pulse-amber glow-amber"
    : "bg-pulse-cyan/14 border-pulse-cyan/50 text-pulse-cyan glow-cyan";
  const chemistryVoltage = inputs.chemistry === "LFP" ? 3.2 : inputs.chemistry === "NMC" ? 3.6 : 2.4;
  const nominalStringVoltage = sizing.cellsSeries * chemistryVoltage;
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

          <div className="mt-8 overflow-x-auto rounded-md border border-border bg-void/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Rack Diagram
              </div>
              <div className="data-cell text-[10px] text-muted-foreground">
                {sizing.cellsSeries}s × {sizing.parallelStrings}p
              </div>
            </div>
            <div
              className="grid min-w-[560px] gap-1.5 md:min-w-0"
              style={{ gridTemplateColumns: `repeat(${visualSeriesSegments}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: visualParallelRows * visualSeriesSegments }).map((_, i) => {
                const row = Math.floor(i / visualSeriesSegments) + 1;
                const col = (i % visualSeriesSegments) + 1;
                const sStart = (col - 1) * cellsPerSeriesSegment + 1;
                const sEnd = Math.min(col * cellsPerSeriesSegment, sizing.cellsSeries);
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`flex min-h-11 items-center justify-center rounded-sm border px-1 text-center transition-transform hover:-translate-y-0.5 ${cellTone}`}
                    title={`Series cells ${sStart}-${sEnd}, parallel string ${row}`}
                  >
                    <span className="data-cell text-[9px] leading-tight">
                      S{sStart}-{sEnd}
                      <br />× P{row}
                    </span>
                  </div>
                );
              })}
            </div>
            {sizing.parallelStrings > visualParallelRows && (
              <div className="mt-2 text-center data-cell text-[10px] text-muted-foreground">
                + {formatNum(sizing.parallelStrings - visualParallelRows)} additional parallel
                strings
              </div>
            )}
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
            Visual: representative rack layout; {isThermalBorderline ? "amber" : "teal"} blocks
            indicate thermal status.
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
