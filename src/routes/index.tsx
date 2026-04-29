import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useBess } from "@/store/bess-store";
import { loadStateFromUrl } from "@/lib/export-utils";
import { BessLayout } from "@/components/bess/BessLayout";
import { SizingModule } from "@/components/bess/SizingModule";
import { useToast } from "@/components/ui/toast";

function SizingPage() {
  const { setInputs, setThermal } = useBess();
  const { showToast } = useToast();

  useEffect(() => {
    const savedState = loadStateFromUrl();
    if (savedState) {
      if (savedState.inputs) {
        setInputs(savedState.inputs);
      }
      if (savedState.thermal) {
        setThermal(savedState.thermal);
      }
      showToast("Settings restored from shared link", "info");
    }
  }, [setInputs, setThermal, showToast]);

  return <SizingModule />;
}

export const Route = createFileRoute("/")({
  component: () => (
    <BessLayout>
      <SizingPage />
    </BessLayout>
  ),
});
