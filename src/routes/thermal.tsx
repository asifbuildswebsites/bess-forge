import { createFileRoute } from "@tanstack/react-router";
import { BessLayout } from "@/components/bess/BessLayout";
import { ThermalModule } from "@/components/bess/ThermalModule";

export const Route = createFileRoute("/thermal")({
  head: () => ({
    meta: [
      { title: "Thermal Analysis — BESS-Calc India" },
      { name: "description", content: "Arrhenius capacity-fade model for BESS thermal degradation." },
    ],
  }),
  component: () => (
    <BessLayout>
      <ThermalModule />
    </BessLayout>
  ),
});
