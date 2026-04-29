import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  SizingInputs,
  computeSizing,
  computeThermal,
  simulateDispatch,
  computeEconomics,
  computeCashFlows,
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
  reportMeta?: {
    projectName: string;
    clientName: string;
    reportDate: string;
  };
}

export function generateReport(d: ReportData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const meta = {
    projectName: d.reportMeta?.projectName?.trim() || "Battery Energy Storage Project",
    clientName: d.reportMeta?.clientName?.trim() || "Client",
    reportDate:
      d.reportMeta?.reportDate ||
      new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  };
  const finalSoh = d.thermalResult.points[d.thermalResult.points.length - 1].soh;
  const summary = `BESS-CALC India evaluated a ${formatNum(d.sizing.nameplateKWh / 1000, 2)} MWh ${d.inputs.chemistry} battery energy storage system for a ${formatNum(d.inputs.peakLoadKW)} kW peak-load application requiring ${d.inputs.autonomyHours} hours of autonomy. The configuration provides ${formatNum(d.sizing.usableKWh)} kWh usable capacity at ${d.inputs.dodPct}% DOD and ${d.inputs.rteEffPct}% round-trip efficiency, with estimated annual savings of ${formatINR(d.economics.annualSavings)} and ${formatINR(d.economics.npv)} NPV over ${d.thermal.years} years. Thermal modelling at ${d.thermal.ambientC} °C projects ${finalSoh.toFixed(1)}% SOH at end of study, supporting consulting-level screening of sizing, operational risk, and project viability.`;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, w, h, "F");
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 38, "F");
  doc.setFillColor(0, 216, 230);
  doc.rect(14, 11, 16, 16, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("B", 22, 22, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("BESS-CALC INDIA", 36, 18);
  doc.setTextColor(170, 190, 205);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("GRID-IN / PROJECT REPORT", 36, 25);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(meta.projectName, 14, 64, { maxWidth: w - 28 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Prepared for ${meta.clientName}`, 14, 78);
  doc.text(`Report date: ${meta.reportDate}`, 14, 86);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 98, w - 14, 98);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("SYSTEM SUMMARY", 14, 110);
  autoTable(doc, {
    startY: 116,
    theme: "plain",
    margin: { left: 14, right: 14 },
    styles: { fontSize: 10, cellPadding: 3, textColor: [15, 23, 42] },
    columnStyles: { 0: { textColor: [100, 116, 139] }, 1: { fontStyle: "bold" } },
    body: [
      ["Nameplate", `${formatNum(d.sizing.nameplateKWh / 1000, 2)} MWh`],
      ["Chemistry", d.inputs.chemistry],
      ["Peak load", `${formatNum(d.inputs.peakLoadKW)} kW`],
      ["Autonomy", `${d.inputs.autonomyHours} hours`],
    ],
  });
  const summaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("EXECUTIVE SUMMARY", 14, summaryY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(doc.splitTextToSize(summary, w - 28), 14, summaryY + 10);
  doc.setFillColor(226, 232, 240);
  doc.rect(14, h - 38, w - 28, 1, "F");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Prepared as a consulting-style screening deliverable. Validate assumptions before investment approval.", 14, h - 24);

  doc.addPage();

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

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (y > 225) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Year-by-Year Cash Flow", 14, y);
  y += 4;
  const cashFlows = computeCashFlows(d.economics, d.thermalResult, 15);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [30, 38, 51], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { halign: "center" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    head: [["Year", "Annual Savings", "OPEX", "Net Cash Flow", "Cumulative", "SOH%"]],
    body: cashFlows.map((row) => [
      `${row.year}`,
      formatINR(row.annualSavings),
      formatINR(row.opex),
      formatINR(row.netCashFlow),
      formatINR(row.cumulativeCashFlow),
      `${row.soh.toFixed(1)}%`,
    ]),
    didParseCell: (data) => {
      const row = cashFlows[data.row.index];
      if (data.section === "body" && row?.paybackYear) {
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [20, 83, 45];
      }
    },
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
