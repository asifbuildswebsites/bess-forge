import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Thermometer, Zap, IndianRupee, Scale } from "lucide-react";
import { ThemeToggle } from "@/components/bess/ThemeToggle";

const tabs = [
  { id: "sizing", label: "01. Sizing", icon: Activity, to: "/" as const },
  { id: "thermal", label: "02. Thermal", icon: Thermometer, to: "/thermal" as const },
  { id: "dispatch", label: "03. Dispatch", icon: Zap, to: "/dispatch" as const },
  { id: "economics", label: "04. Economics", icon: IndianRupee, to: "/economics" as const },
  { id: "compare", label: "05. Compare", icon: Scale, to: "/compare" as const },
];

export function ModuleTabs() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="flex items-center gap-2">
      <nav className="flex bg-void p-1 border border-border rounded-sm">
        {tabs.map((t) => {
          const active = path === t.to;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              to={t.to}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-2 transition-all ${
                active
                  ? "text-pulse-cyan bg-pulse-cyan/10 shadow-[0_0_10px_rgba(0,242,255,0.1)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <ThemeToggle />
    </div>
  );
}
