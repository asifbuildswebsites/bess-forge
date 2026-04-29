import { createFileRoute } from "@tanstack/react-router";
import { BessLayout } from "@/components/bess/BessLayout";
import { DispatchModule } from "@/components/bess/DispatchModule";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Grid Dispatch — BESS-Calc India" },
      { name: "description", content: "24h dispatch simulator with Indian DISCOM ToD tariff." },
    ],
  }),
  component: () => (
    <BessLayout>
      <DispatchModule />
    </BessLayout>
  ),
});
