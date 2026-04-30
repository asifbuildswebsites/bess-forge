# BESS-Calc India

**Battery Energy Storage Sizing & Techno-Economic Calculator for the Indian grid**

BESS-Calc India is an interactive engineering dashboard for sizing Battery Energy Storage Systems and evaluating their commercial viability in Indian tariff and grid conditions. It combines battery pack sizing, dispatch simulation, thermal degradation, grid compliance checks, and techno-economic KPIs in a modern client-side web app.

Designed for engineers, EPC teams, consultants, energy analysts, and commercial decision-makers, the app helps turn early-stage BESS assumptions into a clear system configuration and investment case.

## GitHub About section

**Description**

Interactive BESS sizing and techno-economic calculator for India, with dispatch simulation, degradation, NPV, IRR, payback, and PDF reporting.

**Website**

https://bess-forge.lovable.app

**Topics**

`battery-storage` `bess` `energy-storage` `renewable-energy` `solar` `india` `techno-economic-analysis` `npv` `irr` `react` `tanstack-start` `typescript` `tailwindcss`

## What it does

- Sizes BESS energy and power requirements from peak load, autonomy, chemistry, depth of discharge, and efficiency assumptions.
- Models LFP, NMC, and LTO battery configurations with estimated series cells, parallel strings, total cell count, C-rate, and footprint.
- Simulates a daily load, solar, tariff, battery dispatch, and state-of-charge profile.
- Estimates ToD arbitrage savings and demand charge reduction benefits.
- Calculates core finance metrics including CAPEX, OPEX, annual savings, payback, NPV, IRR, and LCOES.
- Models battery degradation and SOH using a chemistry-aware thermal aging model.
- Checks India-oriented grid compliance considerations.
- Exports a consulting-style PDF report with cover page, project/client details, system summary, and executive summary.

## Key features

### Engineering dashboard UI

- Professional dark dashboard built for technical users.
- Responsive layout with a compact input console and mobile-friendly controls.
- Summary metrics bar for nameplate capacity, C-rate, tariff signal, SOH, annual savings, and investment outcome.
- Dynamic viability status pill for quick commercial interpretation.

### Battery sizing

- Chemistry selection: LFP, NMC, and LTO.
- Energy capacity, power, autonomy, DoD, efficiency, cell capacity, solar PV, and peak load inputs.
- Real-time calculations for usable energy, nameplate energy, C-rate, series cells, parallel strings, total cells, and footprint.
- Clean representative rack visualization instead of dense cell-by-cell clutter.

### Dispatch and tariffs

- Synthetic daily load profile for early-stage feasibility analysis.
- Solar PV generation profile.
- Time-of-day tariff simulation for charging and discharging behavior.
- Grid import, load, solar, BESS power, tariff, and SoC outputs.

### Economics

- CAPEX and OPEX estimation.
- ToD arbitrage and demand charge reduction revenue streams.
- Positive first-load default business case for a more useful starting point.
- NPV, IRR, payback, annual savings, LCOES, and replacement-cost logic.
- Guided UX for scenarios where demand charge reduction improves viability.

### Thermal and lifecycle analysis

- Chemistry-aware degradation model.
- Ambient temperature, C-rate, daily cycles, DoD, and calendar fade factors.
- SOH curve and estimated end-of-life year.
- Thermal risk indication for high-temperature, high-C-rate scenarios.

### PDF reporting

- Project Report cover page with editable project name, client name, and date.
- BESS-CALC India logo header.
- System summary including nameplate, chemistry, peak load, and autonomy.
- Auto-generated executive summary using calculated values.
- Consulting-style PDF output suitable for early-stage client communication.

## Tech stack

- **Framework:** TanStack Start
- **UI:** React 19, TypeScript
- **Styling:** Tailwind CSS v4 with semantic design tokens
- **Charts:** Recharts
- **PDF export:** jsPDF and jsPDF AutoTable
- **Icons:** Lucide React
- **Runtime:** Fully client-side calculations in the browser

## Getting started

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Create a production build:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

## Project structure

```text
src/
  components/bess/     BESS dashboard modules and UI components
  components/ui/       Reusable UI primitives
  lib/                 Calculation engine, export helpers, PDF report logic
  routes/              TanStack Start file-based routes
  store/               Client-side BESS state management
  styles.css           Global theme and Tailwind design tokens
```

## Calculation scope

BESS-Calc India is intended for early-stage feasibility, comparison, and concept engineering. The results are indicative and should be validated with site-specific load data, tariff contracts, equipment quotations, battery vendor specifications, statutory requirements, and detailed engineering studies before procurement or investment decisions.

## Suggested use cases

- Solar + storage feasibility studies
- Industrial and commercial peak-shaving analysis
- Battery sizing option comparison
- Pre-sales BESS proposal support
- Consultant-led techno-economic screening
- Educational demonstrations of BESS sizing and economics

## Roadmap ideas

- CSV upload for real load profiles
- State-wise tariff presets
- Vendor-specific battery and PCS assumptions
- Sensitivity analysis for CAPEX, tariff escalation, and degradation
- Multi-scenario comparison exports
- Project save/load support

## License

Add your preferred license before publishing or accepting external contributions.

## Acknowledgement

Built as an engineering-focused BESS calculator for the Indian market, with emphasis on practical sizing, transparent assumptions, and boardroom-ready reporting.