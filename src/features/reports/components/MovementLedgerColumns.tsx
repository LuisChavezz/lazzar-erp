"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { MovementLedgerRow } from "@/src/features/stock/interfaces/movement-ledger.interface";
import { formatAmountNoCurrency, formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  MOVEMENT_LEDGER_DOCUMENTO_LABELS,
  MOVEMENT_LEDGER_EFECTO_CONFIG,
  MOVEMENT_LEDGER_TM_CONFIG,
  labelOrCode,
} from "../constants/movementLedgerLabels";

const Dash = () => <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;

/** Cantidad del renglón; el cero se atenúa para que resalte la columna que sí movió. */
function QuantityCell({ value }: { value: string }) {
  const formatted = formatExactQuantityValue(value);
  return (
    <span
      className={`text-sm tabular-nums ${
        Number(value) === 0
          ? "text-slate-400 dark:text-slate-600"
          : "font-semibold text-slate-700 dark:text-slate-200"
      }`}
    >
      {formatted}
    </span>
  );
}

const almacenLabel = (row: MovementLedgerRow): string =>
  [row.almacen_codigo, row.almacen_nombre].filter(Boolean).join(" · ");

// ── Columnas del Auxiliar de movimientos ─────────────────────────────────────
//
// NINGUNA columna es ordenable (`enableSorting: false`): el backend entrega el
// kardex del más antiguo al más reciente y `saldo`/`saldo_almacen` son saldos
// corridos en ESE orden; reordenar las filas los dejaría sin sentido.
// Los costos llegan sin moneda (EC-600) y hoy ningún flujo los captura, por eso
// arrancan ocultos (`hiddenByDefault`) y se muestran desde "Mostrar/Ocultar".
// Factoría sin callbacks hoy (el reporte no tiene acciones por fila).

export const getMovementLedgerColumns = (): ColumnDef<MovementLedgerRow>[] => [
  {
    accessorKey: "fecha",
    header: "Fecha",
    enableSorting: false,
    meta: { label: "Fecha" },
    cell: ({ row }) => {
      const raw = row.original.fecha;
      if (!raw) return <Dash />;
      // Timestamp real (UTC): fecha y hora en la zona del usuario.
      return (
        <div className="flex flex-col leading-tight whitespace-nowrap">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {formatShortDate(raw)}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {formatShortTime(raw)}
          </span>
        </div>
      );
    },
  },
  {
    id: "documento",
    accessorFn: (row) => labelOrCode(MOVEMENT_LEDGER_DOCUMENTO_LABELS, row.documento),
    header: "Documento",
    enableSorting: false,
    meta: { label: "Documento" },
    cell: ({ getValue }) => (
      <span className="text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {getValue<string>()}
      </span>
    ),
  },
  {
    id: "tm",
    accessorFn: (row) => MOVEMENT_LEDGER_TM_CONFIG[row.tm]?.label ?? row.tm,
    header: "TM",
    enableSorting: false,
    meta: { label: "Tipo de movimiento" },
    cell: ({ row }) => <StatusBadge status={row.original.tm} config={MOVEMENT_LEDGER_TM_CONFIG} />,
  },
  {
    accessorKey: "costo_unitario",
    header: "Costo",
    enableSorting: false,
    meta: { label: "Costo", align: "right", hiddenByDefault: true },
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {formatAmountNoCurrency(row.original.costo_unitario)}
      </span>
    ),
  },
  {
    accessorKey: "entradas",
    header: "Entradas",
    enableSorting: false,
    meta: { label: "Entradas", align: "right" },
    cell: ({ row }) => <QuantityCell value={row.original.entradas} />,
  },
  {
    accessorKey: "salidas",
    header: "Salidas",
    enableSorting: false,
    meta: { label: "Salidas", align: "right" },
    cell: ({ row }) => <QuantityCell value={row.original.salidas} />,
  },
  {
    id: "efecto",
    accessorFn: (row) => MOVEMENT_LEDGER_EFECTO_CONFIG[row.efecto]?.label ?? row.efecto,
    header: "Cómo afectó al almacén",
    enableSorting: false,
    meta: { label: "Cómo afectó al almacén" },
    cell: ({ row }) => {
      const { efecto, saldo_almacen } = row.original;
      const cfg = MOVEMENT_LEDGER_EFECTO_CONFIG[efecto];
      return (
        <div className="flex flex-col leading-tight whitespace-nowrap">
          <span className={`text-sm font-semibold ${cfg?.textClass ?? "text-slate-600 dark:text-slate-300"}`}>
            {cfg?.label ?? efecto}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            Queda en {formatExactQuantityValue(saldo_almacen)}
          </span>
        </div>
      );
    },
  },
  {
    id: "almacen",
    accessorFn: (row) => almacenLabel(row) || "Sin almacén",
    header: "Almacén",
    enableSorting: false,
    meta: { label: "Almacén" },
    cell: ({ row }) => {
      const label = almacenLabel(row.original);
      // El backend no siempre puede derivar el almacén (detalle sin ubicación):
      // el renglón se muestra igual, marcado.
      if (!label) {
        return (
          <span className="text-sm italic text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Sin almacén
          </span>
        );
      }
      return <span className="text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{label}</span>;
    },
  },
  {
    accessorKey: "usuario",
    header: "Usuario",
    enableSorting: false,
    meta: { label: "Usuario", hideOnMobile: true },
    cell: ({ row }) =>
      row.original.usuario ? (
        <span className="text-sm text-slate-600 dark:text-slate-300">{row.original.usuario}</span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "costo_promedio",
    header: "Revalidación del costo",
    enableSorting: false,
    meta: { label: "Revalidación del costo", align: "right", hiddenByDefault: true },
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {formatAmountNoCurrency(row.original.costo_promedio)}
      </span>
    ),
  },
  {
    id: "folio_referencia",
    accessorFn: (row) => row.folio_referencia ?? "",
    header: "Folio de referencia",
    enableSorting: false,
    meta: { label: "Folio de referencia" },
    cell: ({ row }) =>
      row.original.folio_referencia ? (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {row.original.folio_referencia}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "saldo",
    header: "Saldo corrido",
    enableSorting: false,
    meta: { label: "Saldo corrido", align: "right" },
    cell: ({ row }) => (
      <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
        {formatExactQuantityValue(row.original.saldo)}
      </span>
    ),
  },
];
