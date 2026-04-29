import { createFileRoute } from "@tanstack/react-router";
import { BessLayout } from "@/components/bess/BessLayout";
import { CompareModule } from "@/components/bess/CompareModule";

export const Route = createFileRoute("/compare")({
  component: () => (
    <BessLayout>
      <CompareModule />
    </BessLayout>
  ),
});
