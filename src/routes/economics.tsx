import { createFileRoute } from "@tanstack/react-router";
import { BessLayout } from "@/components/bess/BessLayout";
import { EconomicsModule } from "@/components/bess/EconomicsModule";

export const Route = createFileRoute("/economics")({
  head: () => ({
    meta: [
      { title: "Techno-Economics — BESS-Calc India" },
      { name: "description", content: "CAPEX, NPV, payback and LCOES for BESS projects in India." },
    ],
  }),
  component: () => (
    <BessLayout>
      <EconomicsModule />
    </BessLayout>
  ),
});
