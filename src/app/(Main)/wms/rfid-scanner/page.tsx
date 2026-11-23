import { RfidScannerView } from "@/src/features/rfid-scanner/components/RfidScannerView";

// Página de Scanner RFID — módulo de WMS. Sin altura fija: la tabla trae la
// suya y la página hace scroll si hace falta.
export default function RfidScannerPage() {
  return (
    <div className="w-full">
      <RfidScannerView />
    </div>
  );
}
