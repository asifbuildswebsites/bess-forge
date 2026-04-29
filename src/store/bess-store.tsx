import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import {
  computeSizing,
  computeThermal,
  simulateDispatch,
  computeEconomics,
  SizingInputs,
  Chemistry,
  RevenueStreams,
} from "@/lib/bess-calc";

interface ThermalUiInputs {
  ambientC: number;
  dailyCycles: number;
  years: number;
}

interface BessState {
  inputs: SizingInputs;
  thermal: ThermalUiInputs;
  revenue: RevenueStreams;
  setInputs: (p: Partial<SizingInputs>) => void;
  setThermal: (p: Partial<ThermalUiInputs>) => void;
  setRevenue: (p: Partial<RevenueStreams>) => void;
  sizing: ReturnType<typeof computeSizing>;
  thermalResult: ReturnType<typeof computeThermal>;
  dispatch: ReturnType<typeof simulateDispatch>;
  economics: ReturnType<typeof computeEconomics>;
  computeFor: (chem: Chemistry) => {
    sizing: ReturnType<typeof computeSizing>;
    thermalResult: ReturnType<typeof computeThermal>;
    dispatch: ReturnType<typeof simulateDispatch>;
    economics: ReturnType<typeof computeEconomics>;
  };
}

const Ctx = createContext<BessState | null>(null);

export function BessProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputsState] = useState<SizingInputs>({
    peakLoadKW: 1000,
    desiredEnergyMWh: 4,
    autonomyHours: 4,
    solarKWp: 500,
    chemistry: "LFP",
    cellCapacityAh: 280,
    dodPct: 90,
    rteEffPct: 92,
  });
  const [thermal, setThermalState] = useState<ThermalUiInputs>({
    ambientC: 35,
    dailyCycles: 1.2,
    years: 15,
  });
  const [revenue, setRevenueState] = useState<RevenueStreams>({
    todArbitrage: true,
    demandCharge: false,
    contractedKVA: 500,
    demandRatePerKVA: 400,
  });

  const setInputs = (p: Partial<SizingInputs>) =>
    setInputsState((s) => ({ ...s, ...p }));
  const setThermal = (p: Partial<ThermalUiInputs>) =>
    setThermalState((s) => ({ ...s, ...p }));
  const setRevenue = (p: Partial<RevenueStreams>) =>
    setRevenueState((s) => ({ ...s, ...p }));

  const computeFor = useMemo(() => {
    return (chem: Chemistry) => {
      const localInputs: SizingInputs = { ...inputs, chemistry: chem };
      const sizing = computeSizing(localInputs);
      const dispatch = simulateDispatch(localInputs, sizing);
      const thermalResult = computeThermal({
        ...thermal,
        cRate: sizing.cRate,
        chemistry: chem,
        dodPct: localInputs.dodPct,
      });
      const economics = computeEconomics({
        sizing,
        dispatch,
        thermalResult,
        years: thermal.years,
        dailyCycles: thermal.dailyCycles,
        dodPct: localInputs.dodPct,
        revenue,
      });
      return { sizing, dispatch, thermalResult, economics };
    };
  }, [inputs, thermal, revenue]);

  const sizing = useMemo(() => computeSizing(inputs), [inputs]);
  const dispatch = useMemo(() => simulateDispatch(inputs, sizing), [inputs, sizing]);
  const thermalResult = useMemo(
    () =>
      computeThermal({
        ...thermal,
        cRate: sizing.cRate,
        chemistry: inputs.chemistry,
        dodPct: inputs.dodPct,
      }),
    [thermal, sizing.cRate, inputs.chemistry, inputs.dodPct],
  );
  const economics = useMemo(
    () =>
      computeEconomics({
        sizing,
        dispatch,
        thermalResult,
        years: thermal.years,
        dailyCycles: thermal.dailyCycles,
        dodPct: inputs.dodPct,
        revenue,
      }),
    [sizing, dispatch, thermalResult, thermal.years, thermal.dailyCycles, inputs.dodPct, revenue],
  );

  return (
    <Ctx.Provider
      value={{
        inputs,
        thermal,
        revenue,
        setInputs,
        setThermal,
        setRevenue,
        sizing,
        thermalResult,
        dispatch,
        economics,
        computeFor,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBess() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBess must be inside BessProvider");
  return v;
}
