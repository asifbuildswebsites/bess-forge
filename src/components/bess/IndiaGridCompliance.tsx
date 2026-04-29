import { useState } from "react";
import { useBess } from "@/store/bess-store";
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle, Info, Zap } from "lucide-react";

interface ComplianceItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

const DEFAULT_COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: "frequency",
    label: "Frequency response capability",
    description: "Operation within 50±0.5 Hz range as per CEA standards",
    checked: false,
  },
  {
    id: "ramp_rate",
    label: "Ramp rate compliance",
    description: "<10% per minute for systems >10MW (CERC regulation)",
    checked: false,
  },
  {
    id: "reactive_power",
    label: "Reactive power support capability",
    description: "Power factor correction & voltage regulation support",
    checked: false,
  },
  {
    id: "islanding",
    label: "Islanding protection",
    description: "Anti-islanding protection as per IEEE 1547 / CEA",
    checked: false,
  },
];

const STATE_PRESETS = [
  { name: "Rajasthan", temp: 42 },
  { name: "Gujarat", temp: 40 },
  { name: "Maharashtra", temp: 38 },
  { name: "Tamil Nadu", temp: 36 },
  { name: "Karnataka", temp: 34 },
  { name: "Default", temp: 35 },
];

export function IndiaGridCompliance() {
  const { sizing, thermal, setThermal, inputs } = useBess();
  const [isExpanded, setIsExpanded] = useState(false);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>(DEFAULT_COMPLIANCE_ITEMS);

  // Calculate compliance status based on system parameters
  const complianceStatus = (() => {
    const checkedCount = complianceItems.filter((i) => i.checked).length;
    const totalItems = complianceItems.length;
    const checkedRatio = checkedCount / totalItems;

    // Also check technical parameters
    const hasHighCRate = sizing.cRate > 2;
    const hasHighAmbient = thermal.ambientC > 45;
    const hasLargeSystem = inputs.peakLoadKW > 10000; // >10MW

    if (checkedRatio >= 1 && !hasHighCRate && !hasHighAmbient) {
      return { level: "compliant", label: "Compliant", color: "text-pulse-green", bg: "bg-pulse-green/10", border: "border-pulse-green/40" };
    } else if (checkedRatio >= 0.5 || hasHighCRate || hasHighAmbient) {
      return { level: "review", label: "Review Required", color: "text-pulse-amber", bg: "bg-pulse-amber/10", border: "border-pulse-amber/40" };
    } else {
      return { level: "non_compliant", label: "Non-Compliant", color: "text-pulse-red", bg: "bg-pulse-red/10", border: "border-pulse-red/40" };
    }
  })();

  const toggleComplianceItem = (id: string) => {
    setComplianceItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const applyStatePreset = (temp: number) => {
    setThermal({ ambientC: temp });
  };

  const getStatusIcon = () => {
    switch (complianceStatus.level) {
      case "compliant":
        return <CheckCircle2 className="size-4" />;
      case "review":
        return <AlertCircle className="size-4" />;
      case "non_compliant":
        return <XCircle className="size-4" />;
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md overflow-hidden">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-panel hover:bg-panel/80 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-pulse-cyan/20 flex items-center justify-center">
            <Zap className="size-4 text-pulse-cyan" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold tracking-tight">India Grid Compliance</h3>
            <p className="text-xs text-muted-foreground">
              CEA/CERC regulatory compliance checklist
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider ${complianceStatus.bg} ${complianceStatus.color} ${complianceStatus.border}`}
          >
            {getStatusIcon()}
            <span>{complianceStatus.label}</span>
          </div>
          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-6 border-t border-border pt-5">
          {/* Mobile Status Badge */}
          <div
            className={`sm:hidden flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold uppercase tracking-wider ${complianceStatus.bg} ${complianceStatus.color} ${complianceStatus.border}`}
          >
            {getStatusIcon()}
            <span>{complianceStatus.label}</span>
          </div>

          {/* CEA Technical Standards Checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              CEA Technical Standards
            </h4>
            <div className="space-y-2">
              {complianceItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border bg-void/40 cursor-pointer hover:border-pulse-cyan/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleComplianceItem(item.id)}
                    className="mt-0.5 size-4 rounded border-border bg-void text-pulse-cyan focus:ring-pulse-cyan focus:ring-offset-0"
                  />
                  <div>
                    <div className="text-sm text-foreground">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* State-specific Ambient Temperature Presets */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              State Ambient Temperature Presets
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STATE_PRESETS.map((preset) => {
                const isActive = thermal.ambientC === preset.temp;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyStatePreset(preset.temp)}
                    className={`px-3 py-2 rounded-md border text-xs transition-all ${
                      isActive
                        ? "border-pulse-cyan bg-pulse-cyan/12 text-pulse-cyan"
                        : "border-border bg-void text-muted-foreground hover:border-pulse-cyan/50 hover:text-foreground"
                    }`}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className={`mt-0.5 ${isActive ? "text-pulse-cyan" : "text-muted-foreground"}`}>
                      {preset.temp}°C
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Current ambient: <span className="text-pulse-cyan data-cell">{thermal.ambientC}°C</span>
            </p>
          </div>

          {/* CERC Tariff Reference */}
          <div className="flex items-start gap-2 rounded-md border border-border/50 bg-void/30 p-3">
            <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">CERC Tariff Reference:</span>{" "}
              Current storage tariff norms:{" "}
              <span className="text-pulse-cyan data-cell">₹4-6/kWh (2024-25)</span>.
              <br />
              Actual tariffs may vary by state DISCOM and power purchase agreement terms.
            </div>
          </div>

          {/* Technical Notes */}
          {sizing.cRate > 1 && (
            <div className="flex items-start gap-2 rounded-md border border-pulse-amber/40 bg-pulse-amber/10 p-3">
              <AlertCircle className="size-3.5 text-pulse-amber shrink-0 mt-0.5" />
              <div className="text-[10px] text-pulse-amber/90 leading-relaxed">
                <span className="font-semibold">High C-rate detected ({sizing.cRate.toFixed(2)}C):</span>{" "}
                Systems operating above 1C may require additional grid stability studies
                and frequency response validation as per CEA Regulation 2023.
              </div>
            </div>
          )}

          {thermal.ambientC > 40 && (
            <div className="flex items-start gap-2 rounded-md border border-pulse-amber/40 bg-pulse-amber/10 p-3">
              <AlertCircle className="size-3.5 text-pulse-amber shrink-0 mt-0.5" />
              <div className="text-[10px] text-pulse-amber/90 leading-relaxed">
                <span className="font-semibold">High ambient temperature ({thermal.ambientC}°C):</span>{" "}
                Consider derating and enhanced cooling systems to maintain compliance
                with CEA thermal operating limits.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}