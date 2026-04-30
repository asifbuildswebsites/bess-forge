import { useRef, useState } from "react";
import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  computeCashFlows,
  computeEconomics,
  computeIrr,
  computeSizing,
  computeThermal,
  formatINR,
  formatNum,
  simulateDispatch,
} from "@/lib/bess-calc";
import { Download, ArrowDown, AlertTriangle, ChevronDown } from "lucide-react";
import { generateReport } from "@/lib/pdf-report";

const getDefaultReportDate = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
};

export function EconomicsModule() {
  const {
    economics,
    inputs,
    sizing,
    thermal,
    thermalResult,
    dispatch,
    revenue,
    hasUserModifiedInputs,
    setRevenue,
    setInputs,
  } = useBess();
  const revenueSectionRef = useRef<HTMLDivElement | null>(null);
  const [reportMeta, setReportMeta] = useState(() => ({
    projectName: "Battery Energy Storage Project",
    clientName: "Client Name",
    reportDate: getDefaultReportDate(),
  }));

  const handleExport = () => {
    generateReport({ inputs, sizing, thermal, thermalResult, dispatch, economics, reportMeta });
  };

  const simplePayback = isFinite(economics.paybackYears) ? economics.paybackYears : null;
  const npvIsNegative = economics.npv < 0;
  const showGuidedOnboarding = npvIsNegative && !hasUserModifiedInputs;
  const showNegativeNpvWarning = npvIsNegative && hasUserModifiedInputs;
  const cashFlows = computeCashFlows(economics, thermalResult, 15);
  const irr = computeIrr([-economics.capex, ...cashFlows.map((row) => row.netCashFlow)]);
  const sensitivityRows = [
    getSensitivityRow("Installed cost", "installedCost", 35000),
    getSensitivityRow("Live tariff", "tariff", 1),
    getSensitivityRow("Solar PV size", "solar", inputs.solarKWp),
    getSensitivityRow("DOD", "dod", inputs.dodPct),
  ].sort((a, b) => b.swing - a.swing);
  const maxSensitivityDelta = Math.max(
    ...sensitivityRows.flatMap((row) => [Math.abs(row.lowDelta), Math.abs(row.highDelta)]),
    1,
  );
  const viabilityActions = [
    {
      label: "Enable Demand Charge Reduction",
      detail: revenue.demandCharge ? "Enabled" : "Adds contracted-demand savings",
      onClick: () =>
        setRevenue({
          demandCharge: true,
          contractedKVA: Math.max(revenue.contractedKVA, inputs.peakLoadKW),
        }),
    },
    {
      label: "Reduce autonomy hours",
      detail: `${inputs.autonomyHours}h → ${Math.max(0.5, inputs.autonomyHours - 0.5)}h`,
      onClick: () => setInputs({ autonomyHours: Math.max(0.5, inputs.autonomyHours - 0.5) }),
    },
    {
      label: "Add Solar PV offset",
      detail: `${formatNum(inputs.solarKWp)} → ${formatNum(Math.min(5000, inputs.solarKWp + 500))} kWp`,
      onClick: () => setInputs({ solarKWp: Math.min(5000, inputs.solarKWp + 500) }),
    },
  ];

  function getSensitivityNpv(
    variable: "installedCost" | "tariff" | "solar" | "dod",
    multiplier: number,
  ) {
    const scenarioInputs = {
      ...inputs,
      solarKWp:
        variable === "solar"
          ? Math.max(0, Math.min(5000, inputs.solarKWp * multiplier))
          : inputs.solarKWp,
      dodPct:
        variable === "dod" ? Math.max(50, Math.min(100, inputs.dodPct * multiplier)) : inputs.dodPct,
    };
    const scenarioSizing = variable === "solar" ? sizing : computeSizing(scenarioInputs);
    const scenarioDispatch = simulateDispatch(scenarioInputs, scenarioSizing);
    const dispatchForTariff =
      variable === "tariff"
        ? {
            ...scenarioDispatch,
            annualSavings: scenarioDispatch.annualSavings * multiplier,
          }
        : scenarioDispatch;
    const scenarioThermal = computeThermal({
      ...thermal,
      cRate: scenarioSizing.cRate,
      chemistry: scenarioInputs.chemistry,
      dodPct: scenarioInputs.dodPct,
    });

    return computeEconomics({
      sizing: scenarioSizing,
      dispatch: dispatchForTariff,
      thermalResult: scenarioThermal,
      years: thermal.years,
      dailyCycles: thermal.dailyCycles,
      dodPct: scenarioInputs.dodPct,
      installedCostPerKWh: variable === "installedCost" ? 35000 * multiplier : undefined,
      revenue,
    }).npv;
  }

  function getSensitivityRow(
    label: string,
    variable: "installedCost" | "tariff" | "solar" | "dod",
    base: number,
  ) {
    const low = getSensitivityNpv(variable, 0.8);
    const high = getSensitivityNpv(variable, 1.2);
    return {
      label,
      range: `${formatNum(base * 0.8, variable === "tariff" ? 1 : 0)}–${formatNum(base * 1.2, variable === "tariff" ? 1 : 0)}`,
      lowDelta: low - economics.npv,
      highDelta: high - economics.npv,
      swing: Math.abs(high - low),
    };
  }

  const enableDemandChargeAndScroll = () => {
    setRevenue({
      demandCharge: true,
      contractedKVA: Math.max(revenue.contractedKVA, 600),
    });
    window.setTimeout(() => {
      revenueSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Techno-Economic Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            CAPEX, payback, NPV (10% disc, 15y), and LCOES at ₹35,000/kWh installed cost.
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-pulse-cyan text-void hover:bg-pulse-cyan/90 glow-cyan font-bold"
        >
          <Download className="size-4 mr-2" />
          Download Report (PDF)
        </Button>
      </div>

      <section className="border border-border bg-panel p-5">
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Project Report Cover
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            These fields appear on the PDF cover page.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-2 text-xs text-muted-foreground">
            Project name
            <Input
              value={reportMeta.projectName}
              onChange={(event) =>
                setReportMeta((current) => ({ ...current, projectName: event.target.value }))
              }
              className="border-border bg-void text-foreground"
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            Client name
            <Input
              value={reportMeta.clientName}
              onChange={(event) =>
                setReportMeta((current) => ({ ...current, clientName: event.target.value }))
              }
              className="border-border bg-void text-foreground"
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            Date
            <Input
              type="date"
              value={reportMeta.reportDate}
              onChange={(event) =>
                setReportMeta((current) => ({ ...current, reportDate: event.target.value }))
              }
              className="border-border bg-void text-foreground"
            />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="CAPEX"
          value={formatINR(economics.capex)}
          variant="cyan"
          hint="₹35,000/kWh × nameplate"
        />
        <MetricCard
          label="Annual OPEX"
          value={formatINR(economics.annualOpex)}
          hint="1.5% of CAPEX"
        />
        <MetricCard
          label="Annual Savings"
          value={formatINR(economics.annualSavings)}
          variant="green"
        />
        <MetricCard
          label="Simple Payback"
          value={
            simplePayback === null ? (
              <span className="text-sm leading-snug block">
                N/A — savings insufficient without demand charge revenue
              </span>
            ) : (
              simplePayback.toFixed(1)
            )
          }
          unit={simplePayback === null ? "" : "years"}
          variant={
            simplePayback === null
              ? "red"
              : simplePayback < 7
                ? "green"
                : simplePayback < 12
                  ? "amber"
                  : "red"
          }
          hint={simplePayback === null ? "CAPEX ÷ (Savings − OPEX)" : "CAPEX ÷ (Savings − OPEX)"}
        />
        <MetricCard
          label={`NPV @ 10% (${thermal.years}y)`}
          value={showGuidedOnboarding ? "Setup needed" : formatINR(economics.npv)}
          variant={showGuidedOnboarding ? "cyan" : economics.npv > 0 ? "green" : "red"}
          hint={
            showGuidedOnboarding
              ? "complete revenue stack below"
              : economics.replacementYear
              ? `incl. cell replace yr ${economics.replacementYear}`
              : "no replacement"
          }
        />
        <MetricCard
          label="IRR"
          value={irr === null ? "N/A" : `${(irr * 100).toFixed(1)}%`}
          variant={irr !== null && irr > 0.1 ? "green" : irr !== null && irr > 0 ? "amber" : "red"}
          hint="Improves with demand charge reduction enabled"
        />
        <MetricCard
          label="LCOES"
          value={`₹${economics.lcoes.toFixed(2)}`}
          unit="/kWh"
          variant="violet"
          hint={`${formatNum(thermal.years)}y × ${thermal.dailyCycles}c/day`}
        />
      </div>

      <Collapsible className="bg-panel border border-border p-6">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-cyan">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Year-by-Year Cash Flow
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Years 1–15 with annual savings, OPEX, net cash flow, cumulative cash flow, and SOH.
            </p>
          </div>
          <ChevronDown className="size-4 text-pulse-cyan transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Annual Savings</TableHead>
                <TableHead className="text-right">OPEX</TableHead>
                <TableHead className="text-right">Net Cash Flow</TableHead>
                <TableHead className="text-right">Cumulative Cash Flow</TableHead>
                <TableHead className="text-right">SOH%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlows.map((row) => (
                <TableRow
                  key={row.year}
                  className={
                    row.paybackYear ? "bg-pulse-green/12 hover:bg-pulse-green/18" : undefined
                  }
                >
                  <TableCell className="data-cell text-pulse-cyan">{row.year}</TableCell>
                  <TableCell className="data-cell text-right">
                    {formatINR(row.annualSavings)}
                  </TableCell>
                  <TableCell className="data-cell text-right text-pulse-amber">
                    {formatINR(row.opex)}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {formatINR(row.netCashFlow)}
                  </TableCell>
                  <TableCell
                    className={`data-cell text-right ${row.cumulativeCashFlow >= 0 ? "text-pulse-green" : "text-pulse-red"}`}
                  >
                    {formatINR(row.cumulativeCashFlow)}
                  </TableCell>
                  <TableCell className="data-cell text-right">{row.soh.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Green row marks the first year cumulative cash flow turns positive.
          </p>
        </CollapsibleContent>
      </Collapsible>

      {showGuidedOnboarding && (
        <div className="border border-pulse-cyan/50 bg-pulse-cyan/10 p-5 glow-cyan">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="data-cell text-xs font-bold uppercase tracking-widest text-pulse-cyan">
                Complete business case setup
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/85">
                This default scenario shows arbitrage-only revenue. Enable Demand Charge Reduction below
                or adjust your load inputs to model a complete business case — most Indian C&amp;I
                projects become viable with DCR included.
              </p>
            </div>
            <Button
              type="button"
              onClick={enableDemandChargeAndScroll}
              className="bg-pulse-cyan text-void hover:bg-pulse-cyan/90 glow-cyan font-bold"
            >
              Enable DCR &amp; Recalculate
            </Button>
          </div>
        </div>
      )}

      {showNegativeNpvWarning && (
        <div className="border border-pulse-amber/60 bg-pulse-amber/10 p-5 glow-amber">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-pulse-amber" />
              <div>
                <div className="data-cell text-xs font-bold uppercase tracking-widest text-pulse-amber">
                  Negative NPV detected
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  3 levers to improve viability →
                </div>
              </div>
            </div>
            <div className="grid flex-1 gap-2 md:grid-cols-3 lg:max-w-3xl">
              {viabilityActions.map((action, index) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="group border border-pulse-amber/35 bg-background/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-pulse-amber hover:bg-pulse-amber/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-amber"
                >
                  <span className="data-cell text-[10px] text-pulse-amber">({index + 1})</span>
                  <span className="ml-2 text-xs font-semibold text-foreground group-hover:text-pulse-amber">
                    {action.label}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {action.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {simplePayback === null && !revenue.demandCharge && (
        <div className="flex items-center gap-3 px-4 py-3 border border-pulse-cyan/40 bg-pulse-cyan/5 text-xs">
          <ArrowDown className="size-4 text-pulse-cyan animate-bounce shrink-0" />
          <span className="text-foreground/90">
            Enable <span className="data-cell text-pulse-cyan">Demand Charge Reduction</span> below
            to model a viable business case.
          </span>
        </div>
      )}

      {economics.replacementYear !== null && (
        <div className="border border-pulse-amber/40 bg-pulse-amber/10 p-4 flex items-start gap-3">
          <div className="size-2 rounded-full bg-pulse-amber animate-pulse mt-1.5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-pulse-amber uppercase tracking-wide data-cell">
              Battery Replacement Event Modelled
            </div>
            <div className="text-foreground/80 mt-1">
              SOH crosses 80% in{" "}
              <span className="data-cell text-pulse-amber">year {economics.replacementYear}</span>.
              NPV includes a cell-only swap of{" "}
              <span className="data-cell text-pulse-amber">
                {formatINR(economics.replacementCost)}
              </span>{" "}
              (60% of CAPEX — re-uses BMS / PCS / container / civils).
            </div>
          </div>
        </div>
      )}

      <div ref={revenueSectionRef} className="bg-panel border border-border p-6 scroll-mt-24">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Additional Revenue Streams
        </h3>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-sm font-medium">Demand Charge Reduction</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Annual savings = Contracted kVA × ₹{revenue.demandRatePerKVA} × 12. Adds to Annual
                Savings, NPV, and Payback.
              </div>
            </div>
            <Switch
              checked={revenue.demandCharge}
              onCheckedChange={(c) => setRevenue({ demandCharge: c })}
            />
          </div>

          {revenue.demandCharge && (
            <div className="space-y-3 pl-1">
              <div className="flex justify-between text-xs">
                <label className="text-foreground/80">Contracted Demand</label>
                <span className="data-cell text-pulse-cyan">
                  {revenue.contractedKVA.toLocaleString("en-IN")} kVA
                </span>
              </div>
              <Slider
                value={[revenue.contractedKVA]}
                min={0}
                max={5000}
                step={50}
                onValueChange={(v) => setRevenue({ contractedKVA: v[0] })}
              />
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-muted-foreground">
                  {revenue.contractedKVA.toLocaleString("en-IN")} kVA × ₹
                  {revenue.demandRatePerKVA} × 12
                </span>
                <span className="data-cell text-pulse-green">
                  + {formatINR(economics.demandChargeSavings)}/yr
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-between text-xs">
            <span className="text-muted-foreground uppercase data-cell tracking-wider">
              Total Annual Savings (drives Payback &amp; NPV)
            </span>
            <span className="data-cell text-pulse-green text-sm">
              {formatINR(economics.annualSavings)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-border p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Sensitivity Analysis
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ±20% scenario impact on NPV, ranked by absolute swing.
            </p>
          </div>
          <div className="data-cell text-[10px] uppercase tracking-widest text-muted-foreground">
            Base NPV {formatINR(economics.npv)}
          </div>
        </div>
        <div className="space-y-4">
          {sensitivityRows.map((row) => (
            <div
              key={row.label}
              className="grid gap-2 md:grid-cols-[150px_1fr_86px] md:items-center"
            >
              <div>
                <div className="text-xs font-semibold text-foreground">{row.label}</div>
                <div className="data-cell text-[10px] text-muted-foreground">
                  ±20% · {row.range}
                </div>
              </div>
              <div className="relative h-9 rounded-sm border border-border bg-background/45">
                <div className="absolute left-1/2 top-0 h-full w-px bg-muted-foreground/35" />
                <div
                  className="absolute right-1/2 top-2 h-5 rounded-l-xs border border-pulse-red/50 bg-pulse-red/35"
                  style={{
                    width: `${(Math.abs(Math.min(row.lowDelta, row.highDelta, 0)) / maxSensitivityDelta) * 50}%`,
                  }}
                />
                <div
                  className="absolute left-1/2 top-2 h-5 rounded-r-xs border border-pulse-green/50 bg-pulse-green/30"
                  style={{
                    width: `${(Math.max(row.lowDelta, row.highDelta, 0) / maxSensitivityDelta) * 50}%`,
                  }}
                />
              </div>
              <div className="data-cell text-right text-xs text-pulse-cyan">
                ±₹{(row.swing / 1e7).toFixed(2)} Cr
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel border border-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Project Summary
          </h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <Row k="Chemistry" v={inputs.chemistry} />
              <Row k="Peak Load" v={`${formatNum(inputs.peakLoadKW)} kW`} />
              <Row k="Autonomy" v={`${inputs.autonomyHours} hours`} />
              <Row k="Solar PV" v={`${formatNum(inputs.solarKWp)} kWp`} />
              <Row k="Nameplate" v={`${formatNum(sizing.nameplateKWh)} kWh`} />
              <Row k="DOD / RTE" v={`${inputs.dodPct}% / ${inputs.rteEffPct}%`} />
              <Row k="Operating Years" v={`${thermal.years} years`} />
            </tbody>
          </table>
        </div>

        <div className="bg-panel border border-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Methodology Notes
          </h3>
          <ul className="text-xs text-foreground/80 space-y-2.5 leading-relaxed">
            <li>
              <span className="text-pulse-cyan data-cell">› CAPEX</span> — pegged to ₹35,000/kWh
              based on 2025 Indian utility-scale BESS market.
            </li>
            <li>
              <span className="text-pulse-cyan data-cell">› Savings</span> — derived from rule-based
              dispatch over the published ToD tariff schedule × 365.
            </li>
            <li>
              <span className="text-pulse-cyan data-cell">› NPV</span> — 10% discount rate, 15-year
              horizon, net of OPEX.
            </li>
            <li>
              <span className="text-pulse-amber data-cell">› NPV scope</span> — captures{" "}
              <span className="text-foreground">ToD energy arbitrage only</span>. Demand / capacity
              charges (kVA), DSM penalties, ancillary-services revenue and RE-firming incentives are{" "}
              <span className="text-foreground">not</span> modelled — real-world NPV is typically
              higher.
            </li>
            <li>
              <span className="text-pulse-cyan data-cell">› LCOES</span> — CAPEX divided by lifetime
              usable kWh throughput.
            </li>
            <li>
              <span className="text-pulse-cyan data-cell">› Degradation</span> — Arrhenius fade
              (Ea=24,500 J/mol) applied to projected SOH.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className="py-2 text-muted-foreground">{k}</td>
      <td className="py-2 text-right data-cell text-foreground">{v}</td>
    </tr>
  );
}
