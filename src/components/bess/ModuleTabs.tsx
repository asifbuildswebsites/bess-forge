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
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <nav className="flex max-w-full overflow-x-auto rounded-md border border-border bg-panel/70 p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = path === t.to;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              to={t.to}
              className={`flex shrink-0 items-center gap-2 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all md:px-4 ${
                active
                  ? "text-background bg-pulse-cyan shadow-[0_0_18px_oklch(0.85_0.18_200_/_0.18)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0">
        <ThemeToggle />
      </div>
    </div>
  );
}
