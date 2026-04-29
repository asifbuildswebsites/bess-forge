import { ReactNode } from "react";
import { Sidebar } from "@/components/bess/Sidebar";
import { StatusBanner } from "@/components/bess/StatusBanner";
import { ModuleTabs } from "@/components/bess/ModuleTabs";

export function BessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <StatusBanner />
        <div className="px-8 py-5 border-b border-border bg-panel/30">
          <ModuleTabs />
        </div>
        <div className="flex-1 p-8 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
