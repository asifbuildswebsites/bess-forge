import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  variant?: "default" | "cyan" | "amber" | "green" | "violet" | "red";
}

const variantClasses = {
  default: "text-foreground",
  cyan: "text-pulse-cyan",
  amber: "text-pulse-amber",
  green: "text-pulse-green",
  violet: "text-fiber-violet",
  red: "text-pulse-red",
};

export function MetricCard({ label, value, unit, hint, variant = "default" }: MetricCardProps) {
  return (
    <div className="bg-panel border border-border p-5 relative overflow-hidden">
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">
        {label}
      </p>
      <h2 className={`text-2xl data-cell ${variantClasses[variant]}`}>
        {value}
        {unit && <span className="text-xs text-muted-foreground ml-1.5">{unit}</span>}
      </h2>
      {hint && <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tight">{hint}</p>}
    </div>
  );
}
