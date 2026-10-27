import type { ReactNode } from "react";
import { Button } from "./Button";
import { RefreshIcon, WarningFilledIcon } from "./Icons";

interface SectionErrorNoticeBaseProps {
  /** Solo en la variante `notice`; la `inline` no lo muestra. */
  title?: string;
  message: string;
  /** Solo `inline`: el espaciado, que depende de la tarjeta que lo contiene. */
  className?: string;
}

interface SectionErrorNoticeRetryProps {
  onRetry: () => void;
  /** Reintento en curso: deshabilita el botón y cambia su texto. */
  isRetrying: boolean;
  /**
   * `notice` (por defecto): el aviso ámbar con título. `inline`: el mensaje en
   * rojo y centrado DENTRO de una tarjeta que ya tiene su propio título (el
   * historial de seguimientos, el embudo, las oportunidades recientes).
   */
  variant?: "notice" | "inline";
  action?: never;
}

/**
 * El aviso ámbar SIN "Reintentar": un aviso de la pantalla que no es un error
 * de carga, con su propia acción (o ninguna) en el lugar del botón.
 */
interface SectionErrorNoticeActionProps {
  action?: ReactNode;
  variant?: "notice";
  onRetry?: never;
  isRetrying?: never;
}

type SectionErrorNoticeProps = SectionErrorNoticeBaseProps &
  (SectionErrorNoticeRetryProps | SectionErrorNoticeActionProps);

/**
 * Aviso ámbar de una sección con consulta PROPIA que no pudo cargar, con
 * "Reintentar". Ámbar y no rojo (`ErrorState`) a propósito: el resto de la
 * pantalla sigue disponible, solo falta este bloque. Extraído de la
 * trazabilidad del pedido (`OrderTraceabilitySection`) sin cambiar su markup;
 * lo usan también los indicadores de OP (`ProductionOrderKpisSection`).
 *
 * La variante `inline` es el mismo aviso para una sección que es una tarjeta
 * con título propio: sin marco ni título, y con `role="alert"`.
 *
 * Con `action` en vez de `onRetry` es el mismo aviso ámbar con otra acción
 * (p. ej. "Transferir" en una oportunidad sin vendedor), o sin botón.
 */
export function SectionErrorNotice({
  title,
  message,
  onRetry,
  isRetrying,
  action,
  variant = "notice",
  className = "px-1 py-4",
}: SectionErrorNoticeProps) {
  if (variant === "inline" && onRetry) {
    return (
      <div role="alert" className={`flex flex-col items-center gap-2 text-center ${className}`}>
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        <Button variant="secondary" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Reintentando..." : "Reintentar"}
        </Button>
      </div>
    );
  }

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
      {onRetry ? (
        <Button type="button" variant="secondary" rounded="full" onClick={onRetry} disabled={isRetrying}>
          <RefreshIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {isRetrying ? "Reintentando..." : "Reintentar"}
        </Button>
      ) : (
        action
      )}
    </div>
  );
}
