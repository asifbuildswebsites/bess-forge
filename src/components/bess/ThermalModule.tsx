import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AlertTriangle } from "lucide-react";

export function ThermalModule() {
  const { thermalResult, thermal, sizing } = useBess();
  const finalSoh = thermalResult.points[thermalResult.points.length - 1].soh;
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Thermal Degradation Analysis</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Arrhenius capacity-fade model · A=31630, Ea=24500 J/mol, R=8.314.
        </p>
      </div>

      {thermalResult.runawayRisk && (
        <div className="border border-pulse-red bg-pulse-red/10 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-pulse-red shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-pulse-red uppercase tracking-wide">
              Thermal Runaway Risk
            </div>
            <div className="text-xs text-foreground/80 mt-1">
              Ambient {thermal.ambientC}°C with C-rate {sizing.cRate.toFixed(2)}C exceeds safe
              operating envelope. Active liquid cooling and derating strongly recommended.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Ambient Temperature"
          value={thermal.ambientC}
          unit="°C"
          variant={thermal.ambientC > 40 ? "amber" : "cyan"}
        />
        <MetricCard
          label="End-of-Life Year"
          value={thermalResult.eolYear ?? `>${thermal.years}`}
          unit="yr (SOH<80%)"
          variant={thermalResult.eolYear && thermalResult.eolYear < 8 ? "red" : "green"}
        />
        <MetricCard
          label={`Final SOH @ Year ${thermal.years}`}
          value={finalSoh.toFixed(1)}
          unit="%"
          variant={finalSoh < 70 ? "red" : finalSoh < 80 ? "amber" : "green"}
        />
        <MetricCard
          label="Ah Throughput / Year"
          value={(thermal.dailyCycles * 365 * 280).toLocaleString("en-IN")}
          unit="Ah"
          variant="violet"
        />
      </div>

      <div className="bg-panel border border-border p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
          State of Health Projection
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={thermalResult.points} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="oklch(0.25 0.025 250)" strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                stroke="oklch(0.55 0.02 250)"
                tick={{ fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
                label={{ value: "Year", position: "insideBottom", offset: -5, fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
              />
              <YAxis
                stroke="oklch(0.55 0.02 250)"
                tick={{ fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
                domain={[0, 100]}
                label={{ value: "SOH (%)", angle: -90, position: "insideLeft", fill: "oklch(0.55 0.02 250)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.13 0.02 250)",
                  border: "1px solid oklch(0.25 0.025 250)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "oklch(0.85 0.18 200)" }}
              />
              <ReferenceLine
                y={80}
                stroke="oklch(0.85 0.18 90)"
                strokeDasharray="4 4"
                label={{ value: "EOL 80%", fill: "oklch(0.85 0.18 90)", fontSize: 10, position: "insideTopRight" }}
              />
              <Line
                type="monotone"
                dataKey="soh"
                stroke="oklch(0.85 0.18 200)"
                strokeWidth={2.5}
                dot={{ fill: "oklch(0.85 0.18 200)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
