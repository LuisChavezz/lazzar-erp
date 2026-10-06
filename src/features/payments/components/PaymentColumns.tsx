import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { BanIcon, ChevronRightIcon, ViewIcon } from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { PAGO_ESTATUS_CONFIG } from "../constants/paymentStatus";
import type { Pago } from "../interfaces/payment.interface";

const columnHelper = createColumnHelper<Pago>();

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(PAGO_ESTATUS_CONFIG).map(([estatus, cfg]) => ({
    value: estatus,
    label: cfg.label ?? estatus,
    dotClassName: cfg.dot,
  })),
];

const estatusFilterFn: FilterFn<Pago> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.estatus === filterValue;
};

const METODO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Cheque", label: "Cheque" },
  { value: "Tarjeta", label: "Tarjeta" },
];

const metodoFilterFn: FilterFn<Pago> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.metodo_pago === filterValue;
};

/**
 * Columnas del listado de pagos.
 *
 * El documento NO tiene folio propio en el contrato (`Pago` no expone uno), así
 * que el identificador visible es el `id`.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos de detalle y de cancelación
 * se montan en `PaymentList`, no aquí. Una celda se desmonta al ordenar, filtrar
 * o paginar —y cancelar cambia el `estatus`, que es justo uno de los filtros—,
 * así que un diálogo montado en la celda desaparecería a media interacción.
 */
export const getColumns = (
  onViewDetail: (id: number) => void,
  onCancel: (id: number) => void,
) => {
  const columns = [
    columnHelper.accessor("id", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Pago</span>
          <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: estatusFilterFn,
      cell: (info) => {
        const pago = info.row.original;
        // "Cancelar" solo sobre pagos APLICADOS: cancelar uno ya cancelado es un
        // no-op en el backend, y sobre un `Borrador` (que esta UI no crea pero
        // podría leer) no habría nada que revertir.
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(pago.id),
          },
        ];
        if (pago.estatus === "Aplicado") {
          menuItems.push({
            label: "Cancelar pago",
            icon: BanIcon,
            onSelect: () => onCancel(pago.id),
          });
        }

        const statusCfg = PAGO_ESTATUS_CONFIG[pago.estatus];
        return (
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg?.dot ?? "bg-slate-400"}`}
              title={statusCfg?.label ?? pago.estatus}
              aria-hidden="true"
            />
            <span className="sr-only">{statusCfg?.label ?? pago.estatus}</span>
            <ActionMenu
              items={menuItems}
              ariaLabel={`Acciones del pago #${pago.id}`}
              align="start"
              trigger={
                <button type="button" title="Ver acciones" className="group inline-flex items-center gap-1 cursor-pointer">
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {`#${pago.id}`}
                  </span>
                  <ChevronRightIcon
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </button>
              }
            />
          </div>
        );
      },
    }),
    columnHelper.accessor("proveedor_nombre", {
      header: "Proveedor",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_pago", {
      header: "Fecha de pago",
      cell: (info) => (
        // `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD" — sin esto un
        // navegador al oeste de Greenwich pinta el día anterior. Convención de
        // finanzas (CxC/CxP/pólizas).
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          {formatShortDate(info.getValue(), { timeZone: "UTC" })}
        </span>
      ),
    }),
    columnHelper.accessor("cuenta_bancaria_alias", {
      header: "Cuenta bancaria",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("metodo_pago", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Método</span>
          <ColumnHeaderFilter column={column} options={METODO_FILTER_OPTIONS} label="método de pago" />
        </div>
      ),
      filterFn: metodoFilterFn,
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("referencia", {
      header: "Referencia",
      cell: (info) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("total_pagado", {
      header: "Total pagado",
      meta: { align: "right" },
      cell: (info) => (
        // El pago no expone moneda propia: la divisa vive en la factura de cada
        // CxP aplicada. Se formatea con el MXN por defecto de `formatCurrency`
        // hasta que la fase 2 resuelva la moneda desde las líneas.
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatMoneyValue(info.getValue())}
        </div>
      ),
    }),
  ] as ColumnDef<Pago>[];

  return columns;
};
