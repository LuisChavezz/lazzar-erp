"use client";

import { createColumnHelper, type ColumnDef, type Row } from "@tanstack/react-table";
import { CheckCircleIcon, RejectIcon } from "@/src/components/Icons";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";

/**
 * Hora de la lectura con SEGUNDOS ("14:32:07"). No se usa `formatShortTime`
 * (hh:mm): en un monitor en vivo, con varias lecturas por segundo del mismo
 * lote, dos renglones distintos se verían con la misma hora exacta. `hour12:
 * false` fija el formato de 24 h en vez de dejarlo a merced del ICU del
 * navegador.
 */
const formatScanTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/**
 * Orden NUMÉRICO para las métricas del lector, con los valores ausentes SIEMPRE
 * al final.
 *
 * Hace falta una función propia porque el `accessorFn` de esas columnas colapsa
 * el nulo a `""` (para no perder la búsqueda global, ver el bloque de abajo) y
 * el `basic` de TanStack compara con `>`, que coerce `""` a 0. Como el RSSI es
 * SIEMPRE negativo (dBm), un renglón sin señal reportada se colaba por encima
 * de todas las lecturas reales, leyéndose como la más potente del lote en vez
 * de como un dato que falta.
 *
 * TanStack invierte el resultado en orden descendente, así que "al final"
 * significa al final del ascendente y al principio del descendente; lo que no
 * vuelve a pasar es que un hueco se mezcle ENTRE las lecturas reales.
 */
const numericNullsLast = (rowA: Row<RfidScan>, rowB: Row<RfidScan>, columnId: string): number => {
  const asNumber = (value: unknown) => (typeof value === "number" ? value : null);
  const a = asNumber(rowA.getValue(columnId));
  const b = asNumber(rowB.getValue(columnId));

  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return a === b ? 0 : a > b ? 1 : -1;
};

const columnHelper = createColumnHelper<RfidScan>();

/**
 * Columnas del monitor de lecturas RFID. Tabla de SOLO LECTURA: no hay columna
 * de acciones ni diálogo de detalle — una lectura es un evento del lector, no
 * un documento con vida propia que se pueda abrir o editar.
 *
 * Las columnas del match (`sku`, `color`, `talla`, folio) usan `accessorFn` con
 * `?? ""` y `id` explícito, no `accessor("campo")`: en las lecturas SIN match
 * el backend omite esos campos por completo, y una columna cuyo valor no es
 * string/number en la primera fila queda fuera de la búsqueda global de
 * `DataTable` en TODAS las filas (la trampa de `getColumnCanGlobalFilter` que
 * documenta `DataTable.tsx`). Aquí es el escenario típico, no el raro: el
 * listado viene ordenado por fecha descendente y la lectura más reciente bien
 * puede ser un tag ajeno al ERP.
 */
export const rfidScanColumns = [
  // Primera columna: lo que el operador viene a ver de un vistazo — si el tag
  // que acaba de pasar por la antena es una etiqueta impresa por el ERP.
  columnHelper.accessor("match_impresion", {
    header: "Match",
    size: 90,
    cell: (info) =>
      info.getValue() ? (
        <div className="flex items-center justify-center" title="Etiqueta reconocida">
          <CheckCircleIcon className="w-5 h-5 text-emerald-500" aria-label="Con match" />
        </div>
      ) : (
        <div className="flex items-center justify-center" title="EPC sin etiqueta asociada">
          <RejectIcon className="w-5 h-5 text-rose-500" aria-label="Sin match" />
        </div>
      ),
  }),
  columnHelper.accessor("epc", {
    header: "EPC",
    size: 260,
    cell: (info) => (
      <span
        className="block truncate font-mono text-xs text-slate-700 dark:text-slate-200 font-semibold"
        title={info.getValue()}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.sku ?? "", {
    id: "sku",
    header: "SKU",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-700 dark:text-slate-200 font-semibold">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.color ?? "", {
    id: "color",
    header: "Color",
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.talla ?? "", {
    id: "talla",
    header: "Talla",
    size: 90,
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.impresion_folio ?? "", {
    id: "impresion_folio",
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  // `antenna` y `rssi` son nullable en el modelo (el FX no siempre los
  // reporta), así que van por `accessorFn` por el mismo motivo que las de
  // arriba. Se muestran como texto crudo: son métricas del lector, no
  // cantidades de negocio, y no se les da formato de millares. El `""` del
  // valor ausente conserva la búsqueda global, pero NO puede ordenarse con el
  // comparador por defecto (lo trataría como 0) — de ahí `numericNullsLast`.
  columnHelper.accessor((row) => row.antenna ?? "", {
    id: "antenna",
    header: "Antena",
    size: 90,
    sortingFn: numericNullsLast,
    cell: (info) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {textOrDash(String(info.getValue()))}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.rssi ?? "", {
    id: "rssi",
    header: "RSSI",
    size: 90,
    sortingFn: numericNullsLast,
    cell: (info) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {textOrDash(String(info.getValue()))}
      </span>
    ),
  }),
  columnHelper.accessor("timestamp", {
    header: "Hora",
    size: 110,
    sortingFn: "datetime",
    cell: (info) => (
      <span className="text-sm tabular-nums font-semibold text-slate-700 dark:text-slate-200">
        {formatScanTime(info.getValue())}
      </span>
    ),
  }),
] as ColumnDef<RfidScan>[];
