import { useBess } from "@/store/bess-store";
import { MetricCard } from "@/components/bess/MetricCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { formatINR, formatNum } from "@/lib/bess-calc";
import { Download, ArrowDown } from "lucide-react";
import { generateReport } from "@/lib/pdf-report";

export function EconomicsModule() {
  const { economics, inputs, sizing, thermal, thermalResult, dispatch, revenue, setRevenue } =
    useBess();

  const handleExport = () => {
    generateReport({ inputs, sizing, thermal, thermalResult, dispatch, economics });
  };

  const simplePayback = isFinite(economics.paybackYears) ? economics.paybackYears : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Techno-Economic Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            CAPEX, payback, NPV (10% disc, 15y), and LCOES at ₹35,000/kWh installed cost.
          </p>
        </div>
        <Button onClick={handleExport} className="bg-pulse-cyan text-void hover:bg-pulse-cyan/90 glow-cyan font-bold">
          <Download className="size-4 mr-2" />
          Download Report (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="CAPEX" value={formatINR(economics.capex)} variant="cyan" hint="₹35,000/kWh × nameplate" />
        <MetricCard label="Annual OPEX" value={formatINR(economics.annualOpex)} hint="1.5% of CAPEX" />
        <MetricCard label="Annual Savings" value={formatINR(economics.annualSavings)} variant="green" />
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
          value={formatINR(economics.npv)}
          variant={economics.npv > 0 ? "green" : "red"}
          hint={economics.replacementYear ? `incl. cell replace yr ${economics.replacementYear}` : "no replacement"}
        />
        <MetricCard
          label="LCOES"
          value={`₹${economics.lcoes.toFixed(2)}`}
          unit="/kWh"
          variant="violet"
          hint={`${formatNum(thermal.years)}y × ${thermal.dailyCycles}c/day`}
        />
      </div>

      {simplePayback === null && !revenue.demandCharge && (
        <div className="flex items-center gap-3 px-4 py-3 border border-pulse-cyan/40 bg-pulse-cyan/5 text-xs">
          <ArrowDown className="size-4 text-pulse-cyan animate-bounce shrink-0" />
          <span className="text-foreground/90">
            Enable <span className="data-cell text-pulse-cyan">Demand Charge Reduction</span> below to model a viable business case.
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
              SOH crosses 80% in <span className="data-cell text-pulse-amber">year {economics.replacementYear}</span>.
              NPV includes a cell-only swap of{" "}
              <span className="data-cell text-pulse-amber">{formatINR(economics.replacementCost)}</span>{" "}
              (60% of CAPEX — re-uses BMS / PCS / container / civils).
            </div>
          </div>
        </div>
      )}

      <div className="bg-panel border border-border p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Additional Revenue Streams
        </h3>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="text-sm font-medium">Demand Charge Reduction</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Annual savings = Contracted kVA × ₹400 × 12. Adds to Annual Savings, NPV, and
                Payback.
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
                  {revenue.contractedKVA.toLocaleString("en-IN")} kVA × ₹400 × 12
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
              <span className="text-foreground">ToD energy arbitrage only</span>. Demand /
              capacity charges (kVA), DSM penalties, ancillary-services revenue and RE-firming
              incentives are <span className="text-foreground">not</span> modelled — real-world
              NPV is typically higher.
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
