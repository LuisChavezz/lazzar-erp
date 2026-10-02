import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { SheetCard } from "./OrderSheetPrimitives";

/**
 * Observaciones del pedido, en la tarjeta inferior izquierda donde el
 * formulario de cotización las captura. "Documento relacionado", "Usuario
 * captura" y "Fecha captura" de esa tarjeta no se replican: el pedido no trae
 * los dos primeros y la fecha ya está en Información Comercial.
 */
export function OrderNotesSection({ observaciones }: { observaciones: string | null }) {
  return (
    <SheetCard>
      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Observaciones</p>
      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap wrap-break-word">
        {textOrDash(observaciones)}
      </p>
    </SheetCard>
  );
}
