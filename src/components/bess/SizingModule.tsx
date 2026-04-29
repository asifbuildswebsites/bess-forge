import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { formatNum } from "@/lib/bess-calc";

export function SizingModule() {
  const { sizing, inputs } = useBess();
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Battery Pack Sizing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Capacity, configuration & footprint for the chosen load profile.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Usable Capacity"
          value={formatNum(sizing.usableKWh, 0)}
          unit="kWh"
          variant="cyan"
          hint={`${inputs.peakLoadKW} kW × ${inputs.autonomyHours} h`}
        />
        <MetricCard
          label="Nameplate Capacity"
          value={formatNum(sizing.nameplateKWh, 0)}
          unit="kWh"
          hint={`@ ${inputs.dodPct}% DOD, ${inputs.rteEffPct}% RTE`}
        />
        <MetricCard
          label="Recommended C-Rate"
          value={sizing.cRate.toFixed(2)}
          unit="C"
          variant={sizing.cRate > 1.5 ? "amber" : "green"}
          hint={sizing.cRate > 1 ? "High discharge rate" : "Comfortable rate"}
        />
        <MetricCard
          label="Footprint Estimate"
          value={formatNum(sizing.footprintM2, 0)}
          unit="m²"
          variant="violet"
          hint={`${inputs.chemistry} energy density`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel border border-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
            Pack Configuration
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <Stat label="Cells in Series" value={formatNum(sizing.cellsSeries)} sub="@ 800V bus" />
            <Stat
              label="Parallel Strings"
              value={formatNum(sizing.parallelStrings)}
              sub="280 Ah cells"
            />
            <Stat label="Total Cells" value={formatNum(sizing.totalCells)} sub="approximate" />
          </div>

          <div className="mt-8 grid grid-cols-12 gap-1.5">
            {Array.from({ length: Math.min(sizing.parallelStrings * 12, 96) }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-pulse-cyan/10 border border-pulse-cyan/30 rounded-xs"
                title={`Module ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 data-cell">
            Visual: representative module layout (1 tile ≈ 1 string segment).
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

function LogLine({
  ts,
  color,
  children,
}: {
  ts: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 text-[11px] data-cell leading-tight">
      <span className="text-muted-foreground/60">[{ts}]</span>
      <span className={color}>{children}</span>
    </div>
  );
}
