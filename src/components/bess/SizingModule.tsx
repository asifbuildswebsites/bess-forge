import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { ThermalAnalysis } from "@/components/bess/ThermalAnalysis";
import { IndiaGridCompliance } from "@/components/bess/IndiaGridCompliance";
import { formatNum } from "@/lib/bess-calc";
import { copyShareableLink, copySpecsToClipboard, type ExportState } from "@/lib/export-utils";
import { useToast } from "@/components/ui/toast";
import { useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Info, FileDown, Link2, Copy } from "lucide-react";

export function SizingModule() {
  const { sizing, inputs, setInputs, thermal } = useBess();
  const { showToast } = useToast();
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = useCallback(() => {
    setIsRecalculating(true);
    // Simulate computation delay
    setTimeout(() => {
      setIsRecalculating(false);
    }, 1500);
  }, []);

  const exportState: ExportState = {
    inputs,
    thermal: { ambientC: thermal.ambientC, dailyCycles: thermal.dailyCycles, years: thermal.years },
  };

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = await copyShareableLink(exportState);
      showToast("Link copied to clipboard", "success");
      // Update URL without reload
      window.history.replaceState(null, "", url);
    } catch {
      showToast("Failed to copy link", "error");
    }
  }, [exportState, showToast]);

  const handleCopySpecs = useCallback(async () => {
    try {
      await copySpecsToClipboard(exportState, sizing);
      showToast("Specs copied to clipboard", "success");
    } catch {
      showToast("Failed to copy specs", "error");
    }
  }, [exportState, sizing, showToast]);

  const rackSeriesCells = 250;
  const rackParallelStrings = inputs.parallelStrings;
  const chemistryVoltage = inputs.chemistry === "LFP" ? 3.2 : inputs.chemistry === "NMC" ? 3.6 : 2.4;
  const cellEnergyKWh = (chemistryVoltage * inputs.cellCapacityAh) / 1000;
  const stringEnergyKWh = rackSeriesCells * cellEnergyKWh;
  const requiredStrings = Math.ceil(sizing.nameplateKWh / stringEnergyKWh);
  const footprintPerRack = 1.2;
  const calculatedFootprint = sizing.parallelStrings * footprintPerRack;
  const footprintWarning = Math.abs(calculatedFootprint - sizing.footprintM2) > 1;
  // New footprint calculations
  const rackFootprintM2 = 1.2 * 0.8; // standard rack footprint: 1.2m × 0.8m
  const batteryRackArea = sizing.parallelStrings * rackFootprintM2;
  const aisleClearanceFactor = 1.4; // 40% for maintenance aisles, fire lanes, ESD per NFPA 855
  const totalPadArea = batteryRackArea * aisleClearanceFactor;
  const containersNeeded = Math.ceil(sizing.parallelStrings / 4); // 4 racks per 40ft container
  const containerFootprintM2 = 14.6; // 40ft container: ~12m × 1.2m ≈ 14.6m²
  const containerizedArea = containersNeeded * containerFootprintM2;
  const nominalStringVoltage = rackSeriesCells * chemistryVoltage;
  const capacityPerStringKWh = (nominalStringVoltage * inputs.cellCapacityAh) / 1000;
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
  const footprintScale = Math.max(0.28, Math.min(1, Math.sqrt(sizing.footprintM2 / 145)));
  const cRateStatus =
    sizing.cRate < 1
      ? { label: "C-rate < 1C", tone: "text-pulse-green border-pulse-green/40 bg-pulse-green/10", Icon: CheckCircle2 }
      : sizing.cRate <= 2
        ? { label: "C-rate 1–2C", tone: "text-pulse-amber border-pulse-amber/40 bg-pulse-amber/10", Icon: AlertTriangle }
        : { label: "C-rate > 2C", tone: "text-pulse-red border-pulse-red/40 bg-pulse-red/10", Icon: AlertTriangle };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Battery Pack Sizing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Capacity, configuration & footprint for the chosen load profile.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
            <Stat label="Cells in Series" value={formatNum(rackSeriesCells)} sub="@ 800V bus" />
            <Stat
              label="Parallel Strings"
              value={formatNum(sizing.parallelStrings)}
              sub={`${inputs.cellCapacityAh} Ah cells`}
            />
            <Stat label="Total Cells" value={formatNum(rackSeriesCells * rackParallelStrings)} sub="live rack count" />
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
            <div className="overflow-x-auto pb-2 -mx-1 px-1 md:mx-0 md:px-0">
              <div
                className="grid max-h-[400px] md:max-h-[520px] overflow-auto rounded-sm border border-border bg-background/35 p-3 transition-all duration-300 chart-pan-zoom"
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
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 data-cell text-[10px] text-muted-foreground">
              <StatusDot className="bg-pulse-cyan" label="Normal" />
              <StatusDot className="bg-pulse-amber" label="Warm" />
              <StatusDot className="bg-pulse-red" label="Hot" />
              {selectedCell && <span className="text-foreground">Selected: {selectedCell}</span>}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.8fr]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <LegendItem label="Total cells" value={`${rackSeriesCells} × ${rackParallelStrings} = ${formatNum(rackSeriesCells * rackParallelStrings)}`} />
                <LegendItem label="Voltage" value={`${rackSeriesCells} × ${chemistryVoltage}V = ${formatNum(nominalStringVoltage, 0)}V`} />
                <LegendItem
                  label="Capacity / string"
                  value={`${formatNum(capacityPerStringKWh, 0)} kWh`}
                />
              </div>
              <div className="rounded-sm border border-border bg-background/35 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Battery Rack Area</span>
                  <InfoTooltip text="Rack area = number of racks × 1.2m × 0.8m (standard rack footprint)" />
                </div>
                <div className="data-cell text-sm text-foreground">
                  {batteryRackArea.toFixed(1)} m²
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Pad Area</span>
                  <InfoTooltip text="Pad area = rack area × 1.4 (40% aisle/clearance factor per NFPA 855)" />
                </div>
                <div className="data-cell text-sm text-fiber-violet">
                  {totalPadArea.toFixed(1)} m²
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Containerized Option</span>
                  <InfoTooltip text={`Container = ceil(${sizing.parallelStrings} / 4) × 14.6m² per 40ft container`} />
                </div>
                <div className="data-cell text-sm text-foreground">
                  {containerizedArea.toFixed(1)} m² ({containersNeeded} × 40ft container{containersNeeded > 1 ? 's' : ''})
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 data-cell">
            Visual: one representative rack; slider controls parallel string columns.
          </p>
        </div>

        {/* Thermal Analysis Section */}
        <div className="lg:col-span-3">
          <ThermalAnalysis />
        </div>

        {/* India Grid Compliance Section */}
        <div className="lg:col-span-3">
          <IndiaGridCompliance />
        </div>

        <div className="bg-panel border border-border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Calculation Audit Trail
              </h3>
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-pulse-cyan/50 text-pulse-cyan rounded-sm hover:bg-pulse-cyan/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`size-3 ${isRecalculating ? 'animate-spin' : ''}`} />
                {isRecalculating ? 'Computing...' : 'Recalculate'}
              </button>
            </div>
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-void/40 text-foreground rounded-sm hover:border-pulse-cyan/50 hover:text-pulse-cyan transition-colors"
              >
                <FileDown className="size-3" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-void/40 text-foreground rounded-sm hover:border-pulse-cyan/50 hover:text-pulse-cyan transition-colors"
              >
                <Link2 className="size-3" />
                Copy Link
              </button>
              <button
                type="button"
                onClick={handleCopySpecs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-void/40 text-foreground rounded-sm hover:border-pulse-cyan/50 hover:text-pulse-cyan transition-colors"
              >
                <Copy className="size-3" />
                Copy Specs
              </button>
            </div>
          </div>
          <AuditTrail
            desiredEnergyMWh={inputs.desiredEnergyMWh}
            chemistry={inputs.chemistry}
            chemistryVoltage={chemistryVoltage}
            cellCapacityAh={inputs.cellCapacityAh}
            rackSeriesCells={rackSeriesCells}
            nominalStringVoltage={nominalStringVoltage}
            stringEnergyKWh={stringEnergyKWh}
            nameplateKWh={sizing.nameplateKWh}
            requiredStrings={requiredStrings}
            parallelStrings={sizing.parallelStrings}
            peakLoadKW={inputs.peakLoadKW}
            cRate={sizing.cRate}
            calculatedFootprint={calculatedFootprint}
            actualFootprint={sizing.footprintM2}
            footprintWarning={footprintWarning}
            isRecalculating={isRecalculating}
          />
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

function StatusDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center cursor-help">
      <Info className="size-3 text-muted-foreground/50 hover:text-foreground transition-colors" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 p-2 text-[10px] bg-panel border border-border rounded-sm text-foreground shadow-lg z-50">
        {text}
      </span>
    </span>
  );
}

interface AuditTrailStep {
  step: number;
  status: 'success' | 'warning';
  label: string;
  value: string;
  formula: string;
}

interface AuditTrailProps {
  desiredEnergyMWh: number;
  chemistry: string;
  chemistryVoltage: number;
  cellCapacityAh: number;
  rackSeriesCells: number;
  nominalStringVoltage: number;
  stringEnergyKWh: number;
  nameplateKWh: number;
  requiredStrings: number;
  parallelStrings: number;
  peakLoadKW: number;
  cRate: number;
  calculatedFootprint: number;
  actualFootprint: number;
  footprintWarning: boolean;
  isRecalculating: boolean;
}

function AuditTrail({
  desiredEnergyMWh,
  chemistry,
  chemistryVoltage,
  cellCapacityAh,
  rackSeriesCells,
  nominalStringVoltage,
  stringEnergyKWh,
  nameplateKWh,
  requiredStrings,
  parallelStrings,
  peakLoadKW,
  cRate,
  calculatedFootprint,
  actualFootprint,
  footprintWarning,
  isRecalculating,
}: AuditTrailProps) {
  const peakLoadMW = peakLoadKW / 1000;
  const cRateStatus = cRate < 1 ? 'success' : cRate <= 2 ? 'warning' : 'warning';

  const steps: AuditTrailStep[] = [
    {
      step: 1,
      status: 'success',
      label: 'Energy target set',
      value: `${desiredEnergyMWh.toFixed(1)} MWh`,
      formula: `Nameplate Energy = ${desiredEnergyMWh.toFixed(1)} MWh × 1000 = ${nameplateKWh.toFixed(0)} kWh`,
    },
    {
      step: 2,
      status: 'success',
      label: `Chemistry selected: ${chemistry}`,
      value: `${chemistryVoltage}V, ${cellCapacityAh}Ah`,
      formula: `Cell: ${chemistry} chemistry, Nominal Voltage = ${chemistryVoltage}V, Capacity = ${cellCapacityAh}Ah`,
    },
    {
      step: 3,
      status: 'success',
      label: `Bus voltage: 800V → ${rackSeriesCells} cells in series`,
      value: '',
      formula: `Cells in Series = ceil(800V ÷ ${chemistryVoltage}V) = ${rackSeriesCells}`,
    },
    {
      step: 4,
      status: 'success',
      label: `String energy: ${rackSeriesCells} × ${chemistryVoltage}V × ${cellCapacityAh}Ah = ${stringEnergyKWh.toFixed(0)} kWh`,
      value: '',
      formula: `String Energy = ${rackSeriesCells} × ${chemistryVoltage}V × ${cellCapacityAh}Ah ÷ 1000 = ${stringEnergyKWh.toFixed(1)} kWh`,
    },
    {
      step: 5,
      status: 'success',
      label: `Parallel strings: ${nameplateKWh.toFixed(0)} kWh ÷ ${stringEnergyKWh.toFixed(0)} kWh ≈ ${requiredStrings}${parallelStrings > requiredStrings ? ` → ${parallelStrings} (with redundancy)` : ''}`,
      value: '',
      formula: `Required Strings = ceil(${nameplateKWh.toFixed(0)} ÷ ${stringEnergyKWh.toFixed(0)}) = ${requiredStrings}${parallelStrings > requiredStrings ? `, Using ${parallelStrings} for redundancy margin` : ''}`,
    },
    {
      step: 6,
      status: cRateStatus,
      label: `C-rate check: ${peakLoadMW.toFixed(1)}MW ÷ ${desiredEnergyMWh.toFixed(1)}MWh = ${cRate.toFixed(2)}C — ${cRate < 1 ? 'within nominal (<1C)' : cRate <= 2 ? 'elevated (1-2C)' : 'high (>2C) — consider derating'}`,
      value: '',
      formula: `C-Rate = ${peakLoadKW}kW ÷ ${nameplateKWh.toFixed(0)}kWh = ${cRate.toFixed(3)}C`,
    },
    {
      step: 7,
      status: footprintWarning ? 'warning' : 'success',
      label: `Footprint: ${parallelStrings} racks × 1.2m² = ${calculatedFootprint.toFixed(1)}m²${footprintWarning ? ` (your ${actualFootprint.toFixed(0)}m² differs — verify aisle spacing)` : ''}`,
      value: '',
      formula: `Footprint = ${parallelStrings} racks × 1.2m²/rack = ${calculatedFootprint.toFixed(1)}m²`,
    },
  ];

  return (
    <div className={`space-y-2 ${isRecalculating ? 'opacity-50' : ''} transition-opacity duration-300`}>
      {steps.map((step) => {
        const Icon = step.status === 'success' ? CheckCircle2 : AlertTriangle;
        const iconColor = step.status === 'success' ? 'text-pulse-green' : 'text-pulse-amber';
        return (
          <div
            key={step.step}
            className="flex items-start gap-2 text-[11px] data-cell leading-relaxed group cursor-help"
            title={step.formula}
          >
            <span className="text-muted-foreground/50 text-[10px] mt-0.5 w-4 text-right">
              {isRecalculating ? (
                <RefreshCw className="size-3 animate-spin text-pulse-cyan" />
              ) : (
                step.step
              )}
            </span>
            <Icon className={`size-3.5 mt-0.5 shrink-0 ${iconColor}`} />
            <span className={`${step.status === 'success' ? 'text-foreground' : 'text-pulse-amber'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
