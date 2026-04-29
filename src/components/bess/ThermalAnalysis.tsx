import { useMemo, useState } from "react";
import { useBess } from "@/store/bess-store";
import { Thermometer, AlertTriangle, Info } from "lucide-react";
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
import {
  generateThermalHeatmap,
  getTemperatureColor,
  getTemperatureTextColor,
  getTemperatureDistribution,
  formatNum,
} from "@/lib/bess-calc";

export function ThermalAnalysis() {
  const { sizing, thermal, inputs } = useBess();
  const [hoveredCell, setHoveredCell] = useState<{ series: number; parallel: number; temp: number } | null>(null);

  // Generate thermal heatmap data
  const heatmapData = useMemo(() => {
    return generateThermalHeatmap(
      sizing.cellsSeries,
      sizing.parallelStrings,
      thermal.ambientC,
      sizing.cRate,
    );
  }, [sizing.cellsSeries, sizing.parallelStrings, thermal.ambientC, sizing.cRate]);

  // Get temperature distribution for chart
  const distributionData = useMemo(() => {
    return getTemperatureDistribution(heatmapData.cells, sizing.cellsSeries);
  }, [heatmapData.cells, sizing.cellsSeries]);

  // Check if warning is needed
  const showWarning = heatmapData.maxTemp > 45;
  const showCritical = heatmapData.maxTemp > 55;

  // Get max temp color
  const maxTempColor = useMemo(() => {
    const temp = heatmapData.maxTemp;
    if (temp < 35) return "text-cyan-400";
    if (temp < 40) return "text-green-400";
    if (temp < 45) return "text-yellow-400";
    if (temp < 50) return "text-orange-400";
    return "text-red-400";
  }, [heatmapData.maxTemp]);

  const maxTempBg = useMemo(() => {
    const temp = heatmapData.maxTemp;
    if (temp < 35) return "bg-cyan-500/20 border-cyan-500/50";
    if (temp < 40) return "bg-green-500/20 border-green-500/50";
    if (temp < 45) return "bg-yellow-500/20 border-yellow-500/50";
    if (temp < 50) return "bg-orange-500/20 border-orange-500/50";
    return "bg-red-500/20 border-red-500/50";
  }, [heatmapData.maxTemp]);

  // Sample cells for display (limit to avoid performance issues)
  const displayCells = useMemo(() => {
    const total = heatmapData.cells.length;
    if (total <= 500) return heatmapData.cells;
    // Sample cells for large racks
    const step = Math.ceil(total / 500);
    return heatmapData.cells.filter((_, i) => i % step === 0);
  }, [heatmapData.cells]);

  return (
    <div className="bg-panel border border-border p-6 space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-md bg-pulse-amber/20 flex items-center justify-center">
          <Thermometer className="size-4 text-pulse-amber" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Thermal Status</h3>
          <p className="text-xs text-muted-foreground">
            Cell temperature distribution across battery rack
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div
          className={`flex items-start gap-3 rounded-md border p-3 ${
            showCritical
              ? "border-red-500/50 bg-red-500/10"
              : "border-orange-500/50 bg-orange-500/10"
          }`}
        >
          <AlertTriangle
            className={`size-4 shrink-0 mt-0.5 ${
              showCritical ? "text-red-400" : "text-orange-400"
            }`}
          />
          <div>
            <p className={`text-xs font-semibold ${showCritical ? "text-red-400" : "text-orange-400"}`}>
              {showCritical
                ? "Critical Temperature — Immediate action required"
                : "Thermal derating recommended — consider active cooling"}
            </p>
            <p className={`text-[10px] mt-1 ${showCritical ? "text-red-300/70" : "text-orange-300/70"}`}>
              Max cell temperature: {heatmapData.maxTemp.toFixed(1)}°C.
              {showCritical
                ? " Risk of thermal runaway. Reduce C-rate or improve cooling."
                : " Elevated temperatures may reduce battery lifespan."}
            </p>
          </div>
        </div>
      )}

      {/* Temperature Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Max Temperature */}
        <div className={`rounded-md border p-3 ${maxTempBg}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Max Cell Temp
          </div>
          <div className={`data-cell text-2xl font-bold mt-1 ${maxTempColor}`}>
            {heatmapData.maxTemp.toFixed(1)}°C
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            ΔT = {(heatmapData.maxTemp - thermal.ambientC).toFixed(1)}°C rise
          </div>
        </div>

        {/* Avg Temperature */}
        <div className="rounded-md border border-border bg-void/40 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Avg Cell Temp
          </div>
          <div className="data-cell text-2xl font-bold mt-1 text-foreground">
            {heatmapData.avgTemp.toFixed(1)}°C
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Across {formatNum(heatmapData.cells.length)} cells
          </div>
        </div>

        {/* Ambient Temperature */}
        <div className="rounded-md border border-border bg-void/40 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ambient Temp
          </div>
          <div className="data-cell text-2xl font-bold mt-1 text-pulse-cyan">
            {thermal.ambientC}°C
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            C-Rate: {sizing.cRate.toFixed(2)}C
          </div>
        </div>
      </div>

      {/* Rack Heatmap */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Rack Temperature Heatmap
          </h4>
          {hoveredCell && (
            <div className="text-[10px] data-cell text-pulse-cyan">
              S{hoveredCell.series} × P{hoveredCell.parallel}: {hoveredCell.temp.toFixed(1)}°C
            </div>
          )}
        </div>
        <div
          className="grid max-h-[300px] overflow-auto rounded-md border border-border bg-background/30 p-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(sizing.parallelStrings, 20)}, minmax(16px, 28px))`,
            gap: "2px",
          }}
        >
          {displayCells.map((cell) => {
            const colorClass = getTemperatureColor(cell.temperature);
            return (
              <div
                key={`${cell.series}-${cell.parallel}`}
                className={`aspect-square rounded-sm ${colorClass} transition-all duration-150 hover:scale-110 hover:ring-1 hover:ring-white/30 cursor-pointer`}
                onMouseEnter={() => setHoveredCell({ series: cell.series, parallel: cell.parallel, temp: cell.temperature })}
                onMouseLeave={() => setHoveredCell(null)}
                title={`S${cell.series}×P${cell.parallel}: ${cell.temperature.toFixed(1)}°C`}
              />
            );
          })}
        </div>
        {/* Heatmap Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="font-bold uppercase tracking-wider">Temp:</span>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-blue-500" />
            <span>{"<"}30°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-cyan-500" />
            <span>30-35°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-green-500" />
            <span>35-40°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-yellow-500" />
            <span>40-45°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-orange-500" />
            <span>45-50°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-red-500" />
            <span>{">"}50°C</span>
          </div>
        </div>
      </div>

      {/* Temperature Distribution Chart */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Temperature Distribution by Series Position
        </h4>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={distributionData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="position"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                label={{ value: "Series Position", position: "bottom", offset: 0, fill: "#64748b", fontSize: 10 }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 2", "dataMax + 2"]}
                label={{ value: "Temp (°C)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value: number) => [`${value.toFixed(1)}°C`, "Avg Temp"]}
                labelFormatter={(label) => `Position ${label}`}
              />
              <ReferenceLine
                y={45}
                stroke="#f97316"
                strokeDasharray="5 5"
                label={{ value: "45°C Warning", fill: "#f97316", fontSize: 9, position: "right" }}
              />
              <ReferenceLine
                y={55}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: "55°C Critical", fill: "#ef4444", fontSize: 9, position: "right" }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#22d3ee"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: "#22d3ee" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-2 rounded-md border border-border/50 bg-void/30 p-3">
        <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Temperature model: Center cells experience higher temperatures due to reduced heat dissipation.
          Edge cells benefit from better cooling. Temperature rise is proportional to C-rate and ambient conditions.
        </p>
      </div>
    </div>
  );
}