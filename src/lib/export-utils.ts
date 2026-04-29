import type { SizingInputs, Chemistry } from "@/lib/bess-calc";

export interface ThermalExportState {
  ambientC: number;
  dailyCycles: number;
  years: number;
}

export interface ExportState {
  inputs: SizingInputs;
  thermal: ThermalExportState;
}

/**
 * Generate a shareable URL with all inputs encoded as query params
 */
export function generateShareableUrl(state: ExportState): string {
  const params = new URLSearchParams();
  
  // Battery inputs
  params.set("chem", state.inputs.chemistry.toLowerCase());
  params.set("energy", state.inputs.desiredEnergyMWh.toString());
  params.set("power", (state.inputs.peakLoadKW / 1000).toString());
  params.set("duration", state.inputs.autonomyHours.toString());
  params.set("dod", state.inputs.dodPct.toString());
  params.set("rte", state.inputs.rteEffPct.toString());
  params.set("cells", state.inputs.cellCapacityAh.toString());
  params.set("parallel", state.inputs.parallelStrings.toString());
  
  // Thermal inputs
  params.set("temp", state.thermal.ambientC.toString());
  params.set("cycles", state.thermal.dailyCycles.toString());
  params.set("years", state.thermal.years.toString());
  
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Copy shareable URL to clipboard
 */
export async function copyShareableLink(state: ExportState): Promise<string> {
  const url = generateShareableUrl(state);
  await navigator.clipboard.writeText(url);
  return url;
}

/**
 * Format specs as a clean text block for clipboard
 */
export function formatSpecsText(state: ExportState, sizing: {
  usableKWh: number;
  nameplateKWh: number;
  cRate: number;
  cellsSeries: number;
  parallelStrings: number;
  footprintM2: number;
  totalCells: number;
}): string {
  const lines = [
    "═".repeat(50),
    "  BESS-CALC INDIA — Battery Storage Sizing Report",
    "═".repeat(50),
    "",
    "CONFIGURATION",
    `  Chemistry: ${state.inputs.chemistry} (${getCellVoltage(state.inputs.chemistry)}V nominal)`,
    `  Cell Capacity: ${state.inputs.cellCapacityAh} Ah`,
    `  Cells in Series: ${sizing.cellsSeries}`,
    `  Parallel Strings: ${sizing.parallelStrings}`,
    `  Total Cells: ${sizing.totalCells}`,
    "",
    "CAPACITY",
    `  Nameplate: ${formatNum(sizing.nameplateKWh)} kWh (${(state.inputs.desiredEnergyMWh).toFixed(1)} MWh)`,
    `  Usable (DoD×RTE): ${formatNum(sizing.usableKWh)} kWh`,
    `  Discharge Duration: ${state.inputs.autonomyHours} hrs`,
    "",
    "PERFORMANCE",
    `  Peak Power: ${state.inputs.peakLoadKW} kW (${(state.inputs.peakLoadKW / 1000).toFixed(1)} MW)`,
    `  C-Rate: ${sizing.cRate.toFixed(2)}C`,
    `  Depth of Discharge: ${state.inputs.dodPct}%`,
    `  Round-Trip Efficiency: ${state.inputs.rteEffPct}%`,
    "",
    "FOOTPRINT",
    `  Estimated Area: ${formatNum(sizing.footprintM2)} m²`,
    `  Ambient Temperature: ${state.thermal.ambientC}°C`,
    "",
    "THERMAL ANALYSIS",
    `  Daily Cycles: ${state.thermal.dailyCycles}`,
    `  Analysis Period: ${state.thermal.years} years`,
    "",
    "─".repeat(50),
    `  Generated: ${new Date().toISOString()}`,
    `  Disclaimer: For preliminary sizing only —`,
    `  consult detailed engineering for procurement.`,
    "═".repeat(50),
  ];
  
  return lines.join("\n");
}

/**
 * Copy formatted specs to clipboard
 */
export async function copySpecsToClipboard(
  state: ExportState,
  sizing: {
    usableKWh: number;
    nameplateKWh: number;
    cRate: number;
    cellsSeries: number;
    parallelStrings: number;
    footprintM2: number;
    totalCells: number;
  }
): Promise<void> {
  const text = formatSpecsText(state, sizing);
  await navigator.clipboard.writeText(text);
}

/**
 * Load state from URL query parameters
 */
export function loadStateFromUrl(): Partial<ExportState> | null {
  const params = new URLSearchParams(window.location.search);
  
  // Check if any BESS params exist
  if (!params.has("chem") && !params.has("energy")) {
    return null;
  }
  
  const state: Partial<ExportState> = {};
  
  // Parse chemistry
  const chem = params.get("chem")?.toUpperCase() as Chemistry;
  if (chem && ["LFP", "NMC", "LTO"].includes(chem)) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.chemistry = chem;
  }
  
  // Parse numeric inputs
  const energy = parseFloat(params.get("energy") || "");
  if (isFinite(energy) && energy > 0) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.desiredEnergyMWh = energy;
  }
  
  const power = parseFloat(params.get("power") || "");
  if (isFinite(power) && power > 0) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.peakLoadKW = Math.round(power * 1000);
  }
  
  const duration = parseFloat(params.get("duration") || "");
  if (isFinite(duration) && duration > 0) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.autonomyHours = duration;
  }
  
  const dod = parseInt(params.get("dod") || "");
  if (isFinite(dod) && dod >= 50 && dod <= 100) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.dodPct = dod;
  }
  
  const rte = parseInt(params.get("rte") || "");
  if (isFinite(rte) && rte >= 80 && rte <= 95) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.rteEffPct = rte;
  }
  
  const cells = parseInt(params.get("cells") || "");
  if (isFinite(cells) && cells >= 100) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.cellCapacityAh = cells;
  }
  
  const parallel = parseInt(params.get("parallel") || "");
  if (isFinite(parallel) && parallel >= 1 && parallel <= 50) {
    if (!state.inputs) state.inputs = {} as Partial<SizingInputs>;
    state.inputs.parallelStrings = parallel;
  }
  
  // Parse thermal inputs
  const temp = parseFloat(params.get("temp") || "");
  if (isFinite(temp)) {
    if (!state.thermal) state.thermal = {} as Partial<ThermalExportState>;
    state.thermal.ambientC = temp;
  }
  
  const cycles = parseFloat(params.get("cycles") || "");
  if (isFinite(cycles) && cycles > 0) {
    if (!state.thermal) state.thermal = {} as Partial<ThermalExportState>;
    state.thermal.dailyCycles = cycles;
  }
  
  const years = parseInt(params.get("years") || "");
  if (isFinite(years) && years > 0) {
    if (!state.thermal) state.thermal = {} as Partial<ThermalExportState>;
    state.thermal.years = years;
  }
  
  return state;
}

// Helper functions
function getCellVoltage(chemistry: Chemistry): number {
  const voltages: Record<Chemistry, number> = { LFP: 3.2, NMC: 3.6, LTO: 2.4 };
  return voltages[chemistry];
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-IN");
}