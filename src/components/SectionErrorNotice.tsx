import { Button } from "./Button";
import { RefreshIcon, WarningFilledIcon } from "./Icons";

interface SectionErrorNoticeProps {
  title: string;
  message: string;
  onRetry: () => void;
  /** Reintento en curso: deshabilita el botón y cambia su texto. */
  isRetrying: boolean;
}

/**
 * Aviso ámbar de una sección con consulta PROPIA que no pudo cargar, con
 * "Reintentar". Ámbar y no rojo (`ErrorState`) a propósito: el resto de la
 * pantalla sigue disponible, solo falta este bloque. Extraído de la
 * trazabilidad del pedido (`OrderTraceabilitySection`) sin cambiar su markup;
 * lo usan también los indicadores de OP (`ProductionOrderKpisSection`).
 */
export function SectionErrorNotice({ title, message, onRetry, isRetrying }: SectionErrorNoticeProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-4"
    >
      <WarningFilledIcon className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
      <div className="text-sm flex-1 min-w-0">
        <p className="font-semibold text-amber-800 dark:text-amber-300">{title}</p>
        <p className="text-amber-700 dark:text-amber-400/90">{message}</p>
      </div>
      <Button type="button" variant="secondary" rounded="full" onClick={onRetry} disabled={isRetrying}>
        <RefreshIcon className="w-3.5 h-3.5" aria-hidden="true" />
        {isRetrying ? "Reintentando..." : "Reintentar"}
      </Button>
    </div>
  );
}
