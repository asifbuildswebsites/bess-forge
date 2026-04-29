import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { formatINR } from "@/lib/bess-calc";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function DispatchModule() {
  const { dispatch, economics } = useBess();
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Grid Dispatch & Peak Shaving</h2>
        <p className="text-sm text-muted-foreground mt-1">
          24-hour rule-based dispatch against representative Indian DISCOM ToD tariff.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Cost without BESS"
          value={formatINR(dispatch.costWithoutBess)}
          variant="red"
          hint="Daily grid bill"
        />
        <MetricCard
          label="Cost with BESS"
          value={formatINR(dispatch.costWithBess)}
          variant="cyan"
          hint="After peak shaving"
        />
        <MetricCard
          label="Daily Savings"
          value={formatINR(dispatch.dailySavings)}
          variant="green"
        />
        <MetricCard
          label="Annual Savings"
          value={formatINR(economics.annualSavings)}
          variant="green"
          hint="× 365 days"
        />
      </div>

      <div className="bg-panel border border-border p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
          24h Dispatch Profile · SoC vs Grid Import
        </h3>
        <div className="chart-pan-zoom h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dispatch.points} margin={{ top: 10, right: 28, left: -16, bottom: 10 }}>
              <CartesianGrid stroke="oklch(0.25 0.025 250)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                stroke="oklch(0.55 0.02 250)"
                tick={{ fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
                tickFormatter={(v) => `${Math.floor(v).toString().padStart(2, "0")}:${v % 1 ? "30" : "00"}`}
                interval={5}
              />
              <YAxis
                yAxisId="left"
                stroke="oklch(0.85 0.18 200)"
                tick={{ fill: "oklch(0.85 0.18 200)", fontSize: 11 }}
                label={{ value: "SoC (%)", angle: -90, position: "insideLeft", fill: "oklch(0.85 0.18 200)", fontSize: 11 }}
                domain={[0, 100]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="oklch(0.85 0.18 90)"
                tick={{ fill: "oklch(0.85 0.18 90)", fontSize: 11 }}
                label={{ value: "Power (kW)", angle: 90, position: "insideRight", fill: "oklch(0.85 0.18 90)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.13 0.02 250)",
                  border: "1px solid oklch(0.25 0.025 250)",
                  fontSize: 12,
                }}
                labelFormatter={(v) => `t = ${Number(v).toFixed(1)}h`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="solarKW"
                stroke="oklch(0.82 0.17 75)"
                strokeWidth={2}
                dot={false}
                name="Solar PV (kW)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="gridImportKW"
                stroke="oklch(0.65 0.22 25)"
                fill="oklch(0.65 0.22 25 / 0.18)"
                name="Grid Import (kW)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="loadKW"
                stroke="oklch(0.75 0.15 320)"
                strokeWidth={2}
                dot={false}
                name="Load (kW)"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="soc"
                stroke="oklch(0.85 0.18 200)"
                strokeWidth={2.5}
                dot={false}
                name="SoC (%)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-panel border border-border p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          ToD Tariff Schedule (₹/kWh)
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { t: "00–06", r: 4.5, label: "Off-Peak" },
            { t: "06–10", r: 7.2, label: "Morning Peak" },
            { t: "10–18", r: 5.8, label: "Solar Hours" },
            { t: "18–23", r: 9.1, label: "Evening Peak" },
            { t: "23–24", r: 4.5, label: "Off-Peak" },
          ].map((s) => (
            <div key={s.t} className="border border-border p-3 bg-void/40">
              <div className="text-[10px] text-muted-foreground data-cell uppercase tracking-wider">
                {s.t}
              </div>
              <div
                className={`data-cell text-lg mt-1 ${
                  s.r >= 7 ? "text-pulse-red" : s.r >= 5.5 ? "text-pulse-amber" : "text-pulse-green"
                }`}
              >
                ₹{s.r.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
