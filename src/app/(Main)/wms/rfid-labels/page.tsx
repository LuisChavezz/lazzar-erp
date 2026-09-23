import { RfidLabelsView } from "@/src/features/rfid-labels/components/RfidLabelsView";

// Página de Etiquetas RFID — módulo de WMS
export default function RfidLabelsPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <RfidLabelsView />
    </div>
  );
}
