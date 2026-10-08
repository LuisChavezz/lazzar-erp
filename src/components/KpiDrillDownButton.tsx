/**
 * Botón del drill-down de una tarjeta compacta de `KpiGrid` (va en su
 * `action`). Sin conteo a propósito: la lista del backend suele llegar cortada
 * y su largo contradiría la cifra de la tarjeta; el "Mostrando X de N" va
 * dentro del diálogo. Deshabilitado con la lista vacía (abriría un diálogo sin
 * filas). Un bloque no disponible no lo pinta.
 *
 * Extraído de los indicadores de OP (`ProductionOrderKpisSection`) sin cambiar
 * su markup; lo usan también los de "Mis pedidos" (`PedidoKpisSection`).
 */
export function KpiDrillDownButton({
  label,
  ariaLabel,
  isEmpty,
  onClick,
}: {
  label: string;
  /** Nombre accesible cuando el texto visible, corto, no dice qué hace solo. */
  ariaLabel?: string;
  isEmpty: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isEmpty}
      aria-label={ariaLabel}
      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500"
    >
      {label}
    </button>
  );
}
