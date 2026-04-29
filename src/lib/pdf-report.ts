import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  SizingInputs,
  computeSizing,
  computeThermal,
  simulateDispatch,
  computeEconomics,
  formatINR,
  formatNum,
} from "./bess-calc";

interface ReportData {
  inputs: SizingInputs;
  sizing: ReturnType<typeof computeSizing>;
  thermal: { ambientC: number; dailyCycles: number; years: number };
  thermalResult: ReturnType<typeof computeThermal>;
  dispatch: ReturnType<typeof simulateDispatch>;
  economics: ReturnType<typeof computeEconomics>;
}

export function generateReport(d: ReportData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(20, 22, 32);
  doc.rect(0, 0, w, 26, "F");
  doc.setTextColor(0, 200, 220);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BESS-CALC INDIA", 14, 12);
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Battery Energy Storage Sizing & Techno-Economic Report", 14, 19);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}`, w - 14, 19, { align: "right" });

  let y = 36;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Project Summary", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [30, 38, 51], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Parameter", "Value"]],
    body: [
      ["Cell Chemistry", d.inputs.chemistry],
      ["Peak Load", `${formatNum(d.inputs.peakLoadKW)} kW`],
      ["Desired Autonomy", `${d.inputs.autonomyHours} hours`],
      ["Solar PV Size", `${formatNum(d.inputs.solarKWp)} kWp`],
      ["Depth of Discharge", `${d.inputs.dodPct}%`],
      ["Round-Trip Efficiency", `${d.inputs.rteEffPct}%`],
      ["Ambient Temperature", `${d.thermal.ambientC} °C`],
      ["Daily Cycles", `${d.thermal.dailyCycles}`],
      ["Operating Years", `${d.thermal.years}`],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Sizing Results", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [30, 38, 51], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Metric", "Value"]],
    body: [
      ["Usable Capacity", `${formatNum(d.sizing.usableKWh)} kWh`],
      ["Nameplate Capacity", `${formatNum(d.sizing.nameplateKWh)} kWh`],
      ["Recommended C-Rate", `${d.sizing.cRate.toFixed(2)} C`],
      ["Cells in Series", `${formatNum(d.sizing.cellsSeries)}`],
      ["Parallel Strings", `${formatNum(d.sizing.parallelStrings)}`],
      ["Total Cells", `${formatNum(d.sizing.totalCells)}`],
      ["System Footprint", `${formatNum(d.sizing.footprintM2)} m²`],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Thermal & Dispatch", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [30, 38, 51], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Metric", "Value"]],
    body: [
      [
        "End-of-Life Year (SOH<80%)",
        d.thermalResult.eolYear ? `${d.thermalResult.eolYear}` : `> ${d.thermal.years}`,
      ],
      [
        `Final SOH @ Year ${d.thermal.years}`,
        `${d.thermalResult.points[d.thermalResult.points.length - 1].soh.toFixed(1)}%`,
      ],
      ["Thermal Runaway Risk", d.thermalResult.runawayRisk ? "YES — derate required" : "No"],
      ["Daily Cost without BESS", formatINR(d.dispatch.costWithoutBess)],
      ["Daily Cost with BESS", formatINR(d.dispatch.costWithBess)],
      ["Daily Savings", formatINR(d.dispatch.dailySavings)],
      ["Annual Savings", formatINR(d.economics.annualSavings)],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Techno-Economics", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [30, 38, 51], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Metric", "Value"]],
    body: [
      ["CAPEX", formatINR(d.economics.capex)],
      ["Annual OPEX", formatINR(d.economics.annualOpex)],
      ["Annual Net Savings", formatINR(d.economics.annualSavings - d.economics.annualOpex)],
      [
        "Simple Payback Period",
        isFinite(d.economics.paybackYears) ? `${d.economics.paybackYears.toFixed(1)} years` : "—",
      ],
      ["NPV @ 10% / 15y", formatINR(d.economics.npv)],
      ["LCOES", `₹${d.economics.lcoes.toFixed(2)}/kWh`],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Methodology", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const method = [
    "Sizing — Usable energy = Peak Load × Autonomy. Nameplate = Usable / (DOD × RTE).",
    "Pack assumes 800V DC bus, 280 Ah prismatic cells (LFP 3.2V / NMC 3.6V / NCA 3.65V).",
    "",
    "Thermal — Arrhenius capacity-fade model:",
    "Fade(%) = A × exp(-Ea / (R × T)) × sqrt(Ah_throughput),",
    "with A=31630, Ea=24,500 J/mol, R=8.314, T in Kelvin.",
    "",
    "Dispatch — Rule-based 30-min simulation against an Indian DISCOM ToD tariff:",
    "00-06 ₹4.50, 06-10 ₹7.20, 10-18 ₹5.80, 18-23 ₹9.10, 23-24 ₹4.50.",
    "Charge during off-peak / solar surplus when SoC<90%; discharge in peaks when SoC>20%.",
    "",
    "Economics — CAPEX at ₹35,000/kWh (2025 Indian market). OPEX at 1.5% of CAPEX/year.",
    "NPV uses 10% discount over 15y. LCOES = CAPEX / lifetime usable kWh throughput.",
  ];
  method.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `BESS-Calc India · Portfolio engineering tool · Page ${p}/${pages}`,
      w / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  doc.save(`BESS-Calc-Report-${Date.now()}.pdf`);
}
