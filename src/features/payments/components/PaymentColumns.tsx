import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, ViewIcon } from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { PAGO_ESTATUS_CONFIG } from "../constants/paymentStatus";
import type { Pago } from "../interfaces/payment.interface";

const columnHelper = createColumnHelper<Pago>();

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
      header: "Pago",
      // Mismo criterio que el folio en el resto de las tablas: el identificador
      // principal abre el detalle, con la misma llamada que la acción del menú.
      cell: (info) => (
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original.id)}
          title="Ver detalle"
          className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {`#${info.getValue()}`}
        </button>
      ),
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
      header: "Método",
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
      header: () => <div className="text-right">Total pagado</div>,
      cell: (info) => (
        // El pago no expone moneda propia: la divisa vive en la factura de cada
        // CxP aplicada. Se formatea con el MXN por defecto de `formatCurrency`
        // hasta que la fase 2 resuelva la moneda desde las líneas.
        <div className="text-right tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatMoneyValue(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={PAGO_ESTATUS_CONFIG} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        // "Cancelar" solo sobre pagos APLICADOS: cancelar uno ya cancelado es un
        // no-op en el backend, y sobre un `Borrador` (que esta UI no crea pero
        // podría leer) no habría nada que revertir.
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(row.original.id),
          },
        ];
        if (row.original.estatus === "Aplicado") {
          menuItems.push({
            label: "Cancelar pago",
            icon: BanIcon,
            onSelect: () => onCancel(row.original.id),
          });
        }

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<Pago>[];

  return columns;
};
