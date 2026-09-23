import { RfidScannerView } from "@/src/features/rfid-scanner/components/RfidScannerView";

// Página de Scanner RFID — módulo de WMS
export default function RfidScannerPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <RfidScannerView />
    </div>
  );
}
