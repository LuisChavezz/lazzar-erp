import { formatQuantityValue } from "@/src/utils/formatCurrency";

/**
 * Regreso de una SM: "30 regresaron · 6 faltan" (nucleo-erp #1269). Nada si el
 * backend aún no manda los campos o no ha regresado ni falta nada.
 */
export function SalidaMaquilaPiezas({
  recibidas,
  faltantes,
  estatus,
}: {
  recibidas?: string | number;
  faltantes?: string | number;
  estatus: string;
}) {
  const r = Number(recibidas) || 0;
  const f = Number(faltantes) || 0;
  if (recibidas === undefined || (r === 0 && f === 0) || estatus === "CANCELADA") return null;
  return (
    <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
      {r > 0 && <span className="text-emerald-700 dark:text-emerald-300">{formatQuantityValue(r)} regresaron</span>}
      {r > 0 && f > 0 && " · "}
      {f > 0 && (
        <span className={estatus === "RECIBIDA" ? "font-semibold text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300"}>
          {formatQuantityValue(f)} {estatus === "RECIBIDA" ? "no regresaron" : "por regresar"}
        </span>
      )}
    </span>
  );
}
