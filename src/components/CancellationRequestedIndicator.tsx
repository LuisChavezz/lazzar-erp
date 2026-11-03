import { ClockIcon } from "./Icons";

/** Rótulo por defecto: el mismo para el CFDI de una factura y el REP de un cobro. */
const DEFAULT_LABEL = "Cancelación pendiente de aceptar";

/**
 * Reloj ámbar de una cancelación ante el SAT SOLICITADA y pendiente de que el
 * receptor la acepte (el CFDI de una factura, el REP de un cobro). El documento
 * sigue vigente hasta entonces, así que no es un estado obsoleto.
 *
 * Ícono y no texto: va junto a un folio o un estado en columnas angostas, donde
 * el rótulo se recortaba a "Cancel…" y se confundía con "Cancelada". El rótulo
 * va en `aria-label` y el `title` lo completa con la explicación de cada módulo
 * (`hint`). Donde hay espacio para el texto (cabeceras de detalle), se pinta
 * como texto y no con este indicador.
 */
export function CancellationRequestedIndicator({
  hint,
  label = DEFAULT_LABEL,
}: {
  hint: string;
  label?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 text-amber-600 dark:text-amber-400"
      role="img"
      aria-label={label}
      title={`${label}. ${hint}`}
    >
      <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  );
}
