import { RfidMatchesView } from "@/src/features/rfid-matching/components/RfidMatchesView";

// Página de Encuadres RFID — módulo de operaciones de almacén
export default function RfidMatchingPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Conteo de recepción contra una orden de compra: se escanean los tags de la
          mercancía recibida y se compara lo esperado contra lo leído, producto por
          producto. Aceptar el encuadre no mueve inventario, solo valida el conteo.
        </p>
      </div>

      <RfidMatchesView />
    </div>
  );
}
