import { RfidScannerView } from "@/src/features/rfid-scanner/components/RfidScannerView";

// Página de Scanner RFID — módulo de WMS
export default function RfidScannerPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor en vivo del lector RFID: las etiquetas que pasan frente a la
          antena se muestran aquí conforme llegan, indicando si corresponden a
          una impresión registrada en el ERP.
        </p>
      </div>

      <RfidScannerView />
    </div>
  );
}
