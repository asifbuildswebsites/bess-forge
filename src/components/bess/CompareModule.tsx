import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { formatINR, formatNum, Chemistry } from "@/lib/bess-calc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

const CHEM_COLOR: Record<Chemistry, string> = {
  LFP: "oklch(0.78 0.16 145)",
  NMC: "oklch(0.75 0.18 30)",
  NCA: "oklch(0.7 0.2 300)",
};

export function CompareModule() {
  const { computeFor, thermal } = useBess();
  const lfp = computeFor("LFP");
  const nmc = computeFor("NMC");

  // Merge SOH curves for charting
  const sohData = lfp.thermalResult.points.map((p, i) => ({
    year: p.year,
    LFP: p.soh,
    NMC: nmc.thermalResult.points[i]?.soh ?? null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Chemistry Comparison · LFP vs NMC</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Same load profile, ambient & cycling regime — head-to-head on lifetime, economics, footprint.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChemPanel name="LFP" result={lfp} years={thermal.years} />
        <ChemPanel name="NMC" result={nmc} years={thermal.years} />
      </div>

      <div className="bg-panel border border-border p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
          State of Health · Side-by-Side
        </h3>
        <div className="chart-pan-zoom h-80 w-full md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sohData} margin={{ top: 10, right: 18, left: -14, bottom: 10 }}>
              <CartesianGrid stroke="oklch(0.25 0.025 250)" strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                stroke="oklch(0.55 0.02 250)"
                tick={{ fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
              />
              <YAxis
                stroke="oklch(0.55 0.02 250)"
                tick={{ fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
                domain={[40, 100]}
                label={{ value: "SOH (%)", angle: -90, position: "insideLeft", fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.13 0.02 250)",
                  border: "1px solid oklch(0.25 0.025 250)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={80} stroke="oklch(0.85 0.18 90)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="LFP" stroke={CHEM_COLOR.LFP} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="NMC" stroke={CHEM_COLOR.NMC} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-panel border border-border p-6 overflow-x-auto">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Verdict Matrix
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <th className="py-2">Metric</th>
              <th className="py-2 data-cell" style={{ color: CHEM_COLOR.LFP }}>LFP</th>
              <th className="py-2 data-cell" style={{ color: CHEM_COLOR.NMC }}>NMC</th>
              <th className="py-2">Winner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <Row
              k="Footprint"
              a={`${formatNum(lfp.sizing.footprintM2)} m²`}
              b={`${formatNum(nmc.sizing.footprintM2)} m²`}
              winner={nmc.sizing.footprintM2 < lfp.sizing.footprintM2 ? "NMC" : "LFP"}
            />
            <Row
              k={`SOH @ year ${thermal.years}`}
              a={`${lfp.thermalResult.points[lfp.thermalResult.points.length - 1].soh.toFixed(1)}%`}
              b={`${nmc.thermalResult.points[nmc.thermalResult.points.length - 1].soh.toFixed(1)}%`}
              winner={
                lfp.thermalResult.points[lfp.thermalResult.points.length - 1].soh >
                nmc.thermalResult.points[nmc.thermalResult.points.length - 1].soh
                  ? "LFP"
                  : "NMC"
              }
            />
            <Row
              k="EOL Year (SOH<80%)"
              a={lfp.thermalResult.eolYear ? `Yr ${lfp.thermalResult.eolYear}` : `>${thermal.years}y`}
              b={nmc.thermalResult.eolYear ? `Yr ${nmc.thermalResult.eolYear}` : `>${thermal.years}y`}
              winner={
                (lfp.thermalResult.eolYear ?? 999) > (nmc.thermalResult.eolYear ?? 999) ? "LFP" : "NMC"
              }
            />
            <Row
              k="CAPEX"
              a={formatINR(lfp.economics.capex)}
              b={formatINR(nmc.economics.capex)}
              winner={lfp.economics.capex < nmc.economics.capex ? "LFP" : "NMC"}
            />
            {(() => {
              const lfpPayback = isFinite(lfp.economics.paybackYears) ? lfp.economics.paybackYears : null;
              const nmcPayback = isFinite(nmc.economics.paybackYears) ? nmc.economics.paybackYears : null;
              const winner: Chemistry | "TIE" =
                lfpPayback === null && nmcPayback === null
                  ? "TIE"
                  : lfpPayback === null
                    ? "NMC"
                    : nmcPayback === null
                      ? "LFP"
                      : lfpPayback < nmcPayback
                        ? "LFP"
                        : "NMC";
              return (
                <Row
                  k="Simple Payback"
                  a={lfpPayback === null ? "N/A" : `${lfpPayback.toFixed(1)} yr`}
                  b={nmcPayback === null ? "N/A" : `${nmcPayback.toFixed(1)} yr`}
                  winner={winner}
                />
              );
            })()}
            <Row
              k={`NPV @ 10% (${thermal.years}y)`}
              a={formatINR(lfp.economics.npv)}
              b={formatINR(nmc.economics.npv)}
              winner={lfp.economics.npv > nmc.economics.npv ? "LFP" : "NMC"}
            />
            <Row
              k="LCOES"
              a={`₹${lfp.economics.lcoes.toFixed(2)}/kWh`}
              b={`₹${nmc.economics.lcoes.toFixed(2)}/kWh`}
              winner={lfp.economics.lcoes < nmc.economics.lcoes ? "LFP" : "NMC"}
            />
            <Row
              k="Replacement Event"
              a={lfp.economics.replacementYear ? `Yr ${lfp.economics.replacementYear}` : "None"}
              b={nmc.economics.replacementYear ? `Yr ${nmc.economics.replacementYear}` : "None"}
              winner={
                (lfp.economics.replacementYear ?? 999) > (nmc.economics.replacementYear ?? 999)
                  ? "LFP"
                  : "NMC"
              }
            />
          </tbody>
        </table>
        <p className="mt-4 text-[11px] text-muted-foreground italic">
          Payback improves significantly with demand charge reduction — enable in the Economics tab.
        </p>
      </div>
    </div>
  );
}

function ChemPanel({
  name,
  result,
  years,
}: {
  name: Chemistry;
  result: ReturnType<ReturnType<typeof useBess>["computeFor"]>;
  years: number;
}) {
  const finalSoh = result.thermalResult.points[result.thermalResult.points.length - 1].soh;
  const payback = isFinite(result.economics.paybackYears) ? result.economics.paybackYears : null;
  return (
    <div
      className="border bg-panel p-5 space-y-4"
      style={{ borderColor: CHEM_COLOR[name] + "55" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="data-cell text-lg font-bold" style={{ color: CHEM_COLOR[name] }}>
          {name}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {name === "LFP" ? "Iron Phosphate" : "Nickel Mn Cobalt"}
        </span>
      </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label="Footprint" value={formatNum(result.sizing.footprintM2)} unit="m²" />
        <MetricCard label="CAPEX" value={formatINR(result.economics.capex)} variant="cyan" />
        <MetricCard
          label={`SOH @ ${years}y`}
          value={finalSoh.toFixed(1)}
          unit="%"
          variant={finalSoh < 70 ? "red" : finalSoh < 80 ? "amber" : "green"}
        />
        <MetricCard
          label="Payback"
          value={payback === null ? "N/A" : payback.toFixed(1)}
          unit={payback === null ? "" : "yr"}
          variant={payback === null ? "red" : payback < 7 ? "green" : "amber"}
        />
        <MetricCard
          label="NPV"
          value={formatINR(result.economics.npv)}
          variant={result.economics.npv > 0 ? "green" : "red"}
        />
        <MetricCard
          label="LCOES"
          value={`₹${result.economics.lcoes.toFixed(2)}`}
          unit="/kWh"
          variant="violet"
        />
      </div>
    </div>
  );
}

function Row({ k, a, b, winner }: { k: string; a: string; b: string; winner: Chemistry | "TIE" }) {
  const color = winner === "TIE" ? "oklch(0.65 0.02 250)" : CHEM_COLOR[winner];
  return (
    <tr>
      <td className="py-2 text-muted-foreground text-xs">{k}</td>
      <td className="py-2 data-cell text-foreground">{a}</td>
      <td className="py-2 data-cell text-foreground">{b}</td>
      <td className="py-2">
        <span
          className="data-cell text-[10px] uppercase tracking-widest font-bold"
          style={{ color }}
        >
          ▸ {winner}
        </span>
      </td>
    </tr>
  );
}
