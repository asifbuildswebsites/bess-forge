// BESS-Calc India — calculation engine

export type Chemistry = "LFP" | "NMC" | "LTO";

export interface SizingInputs {
  peakLoadKW: number;
  desiredEnergyMWh: number;
  autonomyHours: number;
  solarKWp: number;
  chemistry: Chemistry;
  cellCapacityAh: number;
  dodPct: number; // 50-100
  rteEffPct: number; // 80-95
}

export interface ThermalInputs {
  ambientC: number;
  dailyCycles: number;
  years: number;
  cRate: number;
  chemistry: Chemistry;
  dodPct: number;
}

const CELL_VOLTAGE: Record<Chemistry, number> = {
  LFP: 3.2,
  NMC: 3.6,
  LTO: 2.4,
};

const ENERGY_DENSITY_WH_PER_L: Record<Chemistry, number> = {
  LFP: 250,
  NMC: 320,
  LTO: 190,
};

// Pack: assume 800V DC bus typical for utility BESS
const PACK_NOMINAL_VOLTAGE = 800;
// Cell capacity assumption (Ah) — typical prismatic
const CELL_AH = 280;

// Containerized footprint scales inversely with cell energy density.
// LFP baseline ≈ 30 m²/MWh; NMC ~30% denser → ~21 m²/MWh; NCA ~22% denser than that.
// (covers cabinets, BMS, HVAC, aisles, transformer pad, fire-gap)
const FOOTPRINT_M2_PER_KWH: Record<Chemistry, number> = {
  LFP: 0.03,
  NMC: 0.0207, // 30% smaller than LFP — higher Wh/L
  LTO: 0.038,
};

export interface SizingResults {
  usableKWh: number;
  nameplateKWh: number;
  cRate: number;
  cellsSeries: number;
  parallelStrings: number;
  footprintM2: number;
  totalCells: number;
}

export function computeSizing(i: SizingInputs): SizingResults {
  const nameplateKWh = i.desiredEnergyMWh * 1000;
  const usableKWh = nameplateKWh * (i.dodPct / 100) * (i.rteEffPct / 100);
  const cRate = i.peakLoadKW / nameplateKWh;
  const cellV = CELL_VOLTAGE[i.chemistry];
  const cellsSeries = Math.ceil(PACK_NOMINAL_VOLTAGE / cellV);
  const cellEnergyKWh = (cellV * i.cellCapacityAh) / 1000;
  const stringEnergyKWh = cellsSeries * cellEnergyKWh;
  const parallelStrings = Math.max(1, Math.ceil(nameplateKWh / stringEnergyKWh));
  // Rough rack pad estimate for early-stage sizing.
  const footprintM2 = parallelStrings * 1.2;
  return {
    usableKWh,
    nameplateKWh,
    cRate,
    cellsSeries,
    parallelStrings,
    footprintM2,
    totalCells: cellsSeries * parallelStrings,
  };
}

// ─── Arrhenius capacity-fade model (chemistry-aware, calibrated) ────────────
// Fade(%) = B_chem · exp(-Ea/(R·T)) · EFC^z · cRateFactor + calendarFade
// EFC = equivalent full cycles weighted by depth-of-discharge.
// Calibration target (literature anchor):
//   LFP @ 40°C, 1.2 c/d, 15y, 90% DoD → SOH ≈ 80% (end-of-warranty point)
const Ea = 24500; // J/mol (SEI growth activation energy)
const R = 8.314;
const Z_EXPONENT = 0.55; // Wang et al. — sub-linear Ah dependence
const B_CHEM: Record<Chemistry, number> = {
  LFP: 1.215e-3,
  NMC: 1.85e-3,
  LTO: 0.82e-3,
};
// Calendar fade % per year at 25°C reference (doubles every ~10°C — Arrhenius)
const CAL_FADE_PER_YEAR_25C: Record<Chemistry, number> = {
  LFP: 0.15,
  NMC: 0.25,
  LTO: 0.1,
};

export interface ThermalPoint {
  year: number;
  soh: number;
}

export function computeThermal(t: ThermalInputs): {
  points: ThermalPoint[];
  eolYear: number | null;
  runawayRisk: boolean;
} {
  const T = t.ambientC + 273.15;
  const B = B_CHEM[t.chemistry];
  const arr = Math.exp(-Ea / (R * T));
  const cRateFactor = 1 + Math.max(0, t.cRate - 0.5) * 0.25; // C-rate stress >0.5C
  const dodFactor = Math.pow(t.dodPct / 80, 0.7); // deeper DoD → faster cyclic fade
  const calFadePerYear = CAL_FADE_PER_YEAR_25C[t.chemistry] * Math.pow(2, (t.ambientC - 25) / 10);

  const points: ThermalPoint[] = [];
  let eolYear: number | null = null;
  for (let y = 0; y <= t.years; y++) {
    const efc = t.dailyCycles * 365 * y; // equivalent full cycles
    const cyclicFade = B * arr * Math.pow(efc, Z_EXPONENT) * cRateFactor * dodFactor * 1e6;
    const calendarFade = calFadePerYear * y;
    const fadePct = cyclicFade + calendarFade;
    const soh = Math.max(0, 100 - fadePct);
    points.push({ year: y, soh });
    if (eolYear === null && soh < 80 && y > 0) eolYear = y;
  }
  // Realistic thermal-runaway envelope: ambient + sustained C-rate
  const runawayRisk = t.ambientC > 45 && t.cRate > 1;
  return { points, eolYear, runawayRisk };
}

// ToD Tariff (₹/kWh) by hour
export function tariffAtHour(hour: number): number {
  if (hour < 6) return 4.5;
  if (hour < 10) return 7.2;
  if (hour < 18) return 5.8;
  if (hour < 23) return 9.1;
  return 4.5;
}

export interface DispatchPoint {
  time: number; // hours, 0-24 in 0.5 steps
  soc: number; // %
  gridImportKW: number;
  loadKW: number;
  solarKW: number;
  bessKW: number; // + discharge, - charge
  tariff: number;
}

export interface DispatchResult {
  points: DispatchPoint[];
  costWithoutBess: number;
  costWithBess: number;
  dailySavings: number;
  annualSavings: number;
}

// Synthetic load profile (normalized 0-1 multiplied by peak)
function loadFactor(h: number): number {
  const morning = Math.exp(-Math.pow((h - 8) / 2, 2));
  const evening = Math.exp(-Math.pow((h - 20) / 2.2, 2));
  const base = 0.45;
  return Math.min(1, base + 0.55 * Math.max(morning, evening));
}

function solarFactor(h: number): number {
  if (h < 6.5 || h > 18) return 0;
  return Math.max(0, Math.sin(((h - 6.5) / 11.5) * Math.PI));
}

export function simulateDispatch(s: SizingInputs, sizing: SizingResults): DispatchResult {
  const dt = 0.5; // hour
  const points: DispatchPoint[] = [];
  let soc = 50;
  const usable = sizing.nameplateKWh * (s.dodPct / 100);
  let costWithout = 0;
  let costWith = 0;

  for (let step = 0; step <= 48; step++) {
    const t = step * dt;
    const h = t % 24;
    const load = s.peakLoadKW * loadFactor(h);
    const solar = s.solarKWp * solarFactor(h);
    const tariff = tariffAtHour(Math.floor(h));
    const isPeak = tariff >= 7;
    const isCheap = tariff <= 5;

    let bess = 0; // + discharge
    const netBeforeBess = load - solar; // kW the grid would import (or export if -ve)
    const inSolarWindow = h >= 10 && h < 18;
    const solarSurplus = Math.max(0, solar - load); // free PV energy

    if (isPeak && soc > 20) {
      bess = Math.min(load, sizing.nameplateKWh * 1); // cap at 1C
    } else if (inSolarWindow && soc < 95 && solar > 0) {
      // Charge from PV surplus first; top up from cheap grid if SoC still low
      const pvCharge = Math.min(solarSurplus, sizing.nameplateKWh * 0.5);
      const gridTopUp = soc < 80 ? Math.min(sizing.nameplateKWh * 0.3, s.peakLoadKW * 0.3) : 0;
      bess = -(pvCharge + gridTopUp);
    } else if (isCheap && soc < 90) {
      const chargePower = Math.min(sizing.nameplateKWh * 0.5, s.peakLoadKW * 0.5);
      bess = -chargePower;
    }

    const energyDelta = bess * dt;
    if (energyDelta >= 0) {
      soc -= (energyDelta / usable) * 100;
    } else {
      soc -= ((energyDelta * (s.rteEffPct / 100)) / usable) * 100;
    }
    soc = Math.max(5, Math.min(100, soc));

    const gridImport = Math.max(0, netBeforeBess - bess);
    const gridImportNoBess = Math.max(0, netBeforeBess);

    costWithout += gridImportNoBess * dt * tariff;
    costWith += gridImport * dt * tariff;

    if (step <= 48) {
      points.push({
        time: t,
        soc,
        gridImportKW: gridImport,
        loadKW: load,
        solarKW: solar,
        bessKW: bess,
        tariff,
      });
    }
  }

  const oneDay = points.slice(0, 49);
  const daily = costWithout / 2 - costWith / 2;
  return {
    points: oneDay,
    costWithoutBess: costWithout / 2,
    costWithBess: costWith / 2,
    dailySavings: daily,
    annualSavings: daily * 365,
  };
}

export interface RevenueStreams {
  todArbitrage: boolean;
  demandCharge: boolean;
  contractedKVA: number; // kVA
  demandRatePerKVA: number; // ₹/kVA/month
}

export interface EconomicsInputs {
  sizing: SizingResults;
  dispatch: DispatchResult;
  thermalResult: { points: ThermalPoint[]; eolYear: number | null };
  years: number;
  dailyCycles: number;
  dodPct: number;
  installedCostPerKWh?: number;
  revenue?: RevenueStreams;
}

export interface EconomicsResults {
  capex: number;
  annualOpex: number;
  arbitrageSavings: number; // ToD only
  demandChargeSavings: number; // annual
  annualSavings: number; // total enabled streams
  paybackYears: number;
  npv: number;
  lcoes: number;
  replacementYear: number | null;
  replacementCost: number;
}

export interface CashFlowRow {
  year: number;
  annualSavings: number;
  opex: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  soh: number;
  paybackYear: boolean;
}

export function computeIrr(cashFlows: number[], guess = 0.1): number | null {
  if (cashFlows.length < 2 || !cashFlows.some((v) => v < 0) || !cashFlows.some((v) => v > 0)) {
    return null;
  }

  let rate = guess;
  for (let iteration = 0; iteration < 50; iteration++) {
    let npv = 0;
    let derivative = 0;

    for (let year = 0; year < cashFlows.length; year++) {
      const discount = Math.pow(1 + rate, year);
      npv += cashFlows[year] / discount;
      if (year > 0) {
        derivative -= (year * cashFlows[year]) / Math.pow(1 + rate, year + 1);
      }
    }

    if (Math.abs(npv) < 1) return rate;
    if (Math.abs(derivative) < 1e-9) return null;

    const nextRate = rate - npv / derivative;
    if (!isFinite(nextRate) || nextRate <= -0.99 || nextRate > 10) return null;
    if (Math.abs(nextRate - rate) < 1e-7) return nextRate;
    rate = nextRate;
  }

  return null;
}

const CAPEX_PER_KWH = 35000; // ₹ — 2025 Indian utility-scale BESS
// Cell-only replacement is ~60% of original CAPEX (re-use BMS, PCS, container, civils)
const REPLACEMENT_FRACTION = 0.6;

export function computeEconomics(e: EconomicsInputs): EconomicsResults {
  const capex = e.sizing.nameplateKWh * (e.installedCostPerKWh ?? CAPEX_PER_KWH);
  const annualOpex = capex * 0.015;

  const rev = e.revenue ?? {
    todArbitrage: true,
    demandCharge: false,
    contractedKVA: 0,
    demandRatePerKVA: 400,
  };

  const arbitrageSavings = rev.todArbitrage ? e.dispatch.annualSavings : 0;
  // Demand-charge reduction: contracted kVA × ₹/kVA/month × 12
  const demandChargeSavings = rev.demandCharge ? rev.contractedKVA * rev.demandRatePerKVA * 12 : 0;

  const annualSavings = arbitrageSavings + demandChargeSavings;
  const netAnnual = annualSavings - annualOpex;

  // Battery replacement event: triggered at end-of-life (SOH<80%) within horizon
  const replacementYear = e.thermalResult.eolYear ?? null;
  const replacementCost = replacementYear !== null ? capex * REPLACEMENT_FRACTION : 0;

  // Simple payback — cumulative net cash crossing CAPEX, accounting for
  // savings degradation tracking SOH (arbitrage degrades; demand-charge does not).
  let cumCash = -capex;
  let paybackYears = Infinity;
  for (let y = 1; y <= 30; y++) {
    const sohIdx = Math.min(y, e.thermalResult.points.length - 1);
    const soh = e.thermalResult.points[sohIdx]?.soh ?? 100;
    const yearSavings = arbitrageSavings * (soh / 100) + demandChargeSavings - annualOpex;
    cumCash += yearSavings;
    if (replacementYear !== null && y === replacementYear) {
      cumCash -= replacementCost;
    }
    if (cumCash >= 0 && !isFinite(paybackYears)) {
      const prev = cumCash - yearSavings;
      paybackYears = y - 1 + Math.abs(prev) / (Math.abs(prev) + cumCash);
      break;
    }
  }
  if (!isFinite(paybackYears) && netAnnual > 0) paybackYears = capex / netAnnual;

  // NPV at 10% over horizon
  const r = 0.1;
  let npv = -capex;
  for (let y = 1; y <= e.years; y++) {
    const sohIdx = Math.min(y, e.thermalResult.points.length - 1);
    const soh = e.thermalResult.points[sohIdx]?.soh ?? 100;
    const yearCash = arbitrageSavings * (soh / 100) + demandChargeSavings - annualOpex;
    npv += yearCash / Math.pow(1 + r, y);
    if (replacementYear !== null && y === replacementYear) {
      npv -= replacementCost / Math.pow(1 + r, y);
    }
  }

  // LCOES — degradation-weighted lifetime throughput
  const usablePerCycle = e.sizing.nameplateKWh * (e.dodPct / 100);
  let lifetimeKWh = 0;
  for (let y = 1; y <= e.years; y++) {
    const sohIdx = Math.min(y, e.thermalResult.points.length - 1);
    const soh = e.thermalResult.points[sohIdx]?.soh ?? 100;
    lifetimeKWh += usablePerCycle * e.dailyCycles * 365 * (soh / 100);
  }
  const totalCost = capex + replacementCost + annualOpex * e.years;
  const lcoes = lifetimeKWh > 0 ? totalCost / lifetimeKWh : 0;

  return {
    capex,
    annualOpex,
    arbitrageSavings,
    demandChargeSavings,
    annualSavings,
    paybackYears,
    npv,
    lcoes,
    replacementYear,
    replacementCost,
  };
}

export function computeCashFlows(
  economics: EconomicsResults,
  thermalResult: { points: ThermalPoint[] },
  years = 15,
): CashFlowRow[] {
  let cumulative = -economics.capex;
  let paybackMarked = false;

  return Array.from({ length: years }, (_, idx) => {
    const year = idx + 1;
    const soh = thermalResult.points[Math.min(year, thermalResult.points.length - 1)]?.soh ?? 100;
    const annualSavings = economics.arbitrageSavings * (soh / 100) + economics.demandChargeSavings;
    let netCashFlow = annualSavings - economics.annualOpex;
    if (economics.replacementYear !== null && year === economics.replacementYear) {
      netCashFlow -= economics.replacementCost;
    }

    const previousCumulative = cumulative;
    cumulative += netCashFlow;
    const paybackYear = !paybackMarked && previousCumulative < 0 && cumulative >= 0;
    if (paybackYear) paybackMarked = true;

    return {
      year,
      annualSavings,
      opex: economics.annualOpex,
      netCashFlow,
      cumulativeCashFlow: cumulative,
      soh,
      paybackYear,
    };
  });
}

export function formatINR(n: number): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatNum(n: number, digits = 0): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
