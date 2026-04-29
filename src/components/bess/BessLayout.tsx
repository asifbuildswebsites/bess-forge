import { ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { Sidebar, MobileSettingsPanel } from "@/components/bess/Sidebar";
import { StatusBanner } from "@/components/bess/StatusBanner";
import { ModuleTabs } from "@/components/bess/ModuleTabs";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function BessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <StatusBanner />
        <div className="flex items-center gap-3 border-b border-border bg-panel/30 px-4 py-4 md:px-8 md:py-5">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 border-border bg-void/60 text-pulse-cyan md:hidden"
                aria-label="Open settings"
              >
                <Settings2 className="size-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[88svh] border-border bg-panel text-foreground md:hidden">
              <DrawerHeader className="sr-only">
                <DrawerTitle>Settings</DrawerTitle>
                <DrawerDescription>Battery sizing and economics controls.</DrawerDescription>
              </DrawerHeader>
              <MobileSettingsPanel />
            </DrawerContent>
          </Drawer>
          <ModuleTabs />
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
