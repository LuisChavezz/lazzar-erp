import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { BanIcon, ViewIcon } from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatAmountNoCurrency } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { METODO_PAGO_CONFIG, PAGO_ESTATUS_CONFIG } from "../constants/paymentStatus";
import type { Pago } from "../interfaces/payment.interface";
import { usePaymentRowActionsContext } from "../hooks/usePaymentRowActions";

const columnHelper = createColumnHelper<Pago>();

/** Texto de la cuenta bancaria: su alias, o `Cuenta #N` si no tiene (`alias` es nullable). */
const getCuentaLabel = (pago: Pago): string =>
  pago.cuenta_bancaria_alias || `Cuenta #${pago.cuenta_bancaria}`;

/**
 * Celda del identificador: el pago NO tiene folio propio en el contrato, así que
 * su `#id` ES el menú de la fila (`FolioActionMenu`, modo folio) y debajo va su
 * estatus. "Ver detalle" es siempre la primera acción. Callbacks y "en vuelo"
 * llegan por contexto (`PaymentRowActionsProvider`).
 */
function PaymentIdCell({ pago }: { pago: Pago }) {
  const { onViewDetail, onCancel, busyIds } = usePaymentRowActionsContext();
  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(pago) },
  ];
  // "Cancelar" solo sobre pagos APLICADOS: cancelar uno ya cancelado es un no-op
  // en el backend, y sobre un `Borrador` (que esta UI no crea pero podría leer)
  // no habría nada que revertir.
  if (pago.estatus === "Aplicado") {
    items.push({
      label: "Cancelar pago",
      icon: BanIcon,
      onSelect: () => onCancel(pago),
      disabled: busyIds.includes(pago.id),
    });
  }
  return (
    <FolioActionMenu
      folio={`#${pago.id}`}
      items={items}
      status={<StatusBadge status={pago.estatus} config={PAGO_ESTATUS_CONFIG} />}
    />
  );
}

/**
 * Columnas del listado de pagos. No reciben nada: callbacks y "en vuelo" llegan
 * al menú por `PaymentRowActionsProvider`, así una acción no remonta las celdas.
 *
 * El documento NO tiene folio propio en el contrato (`Pago` no expone uno), así
 * que el identificador visible es el `id`.
 *
 * Los diálogos de detalle y de cancelación se montan en `PaymentList`, no aquí:
 * una celda se desmonta al ordenar, filtrar o paginar —y cancelar cambia el
 * `estatus`, que es justo uno de los filtros—.
 */
export const getColumns = () => {
  const columns = [
    columnHelper.accessor("id", {
      header: "Pago",
      size: 150,
      cell: (info) => <PaymentIdCell pago={info.row.original} />,
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
    // Mismo texto en la celda, la búsqueda y la opción del filtro.
    columnHelper.accessor((row) => getCuentaLabel(row), {
      id: "cuenta_bancaria_alias",
      header: "Cuenta bancaria",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
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
      header: "Total pagado",
      meta: { align: "right" },
      cell: (info) => (
        // El pago no expone moneda propia: la divisa vive en la factura de cada
        // CxP aplicada, y el renglón no trae con qué resolverla. Se pinta sin
        // símbolo y con 2 decimales: un "$" afirmaría pesos.
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatAmountNoCurrency(info.getValue())}
        </div>
      ),
    }),
  ] as ColumnDef<Pago>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * - El `#id` filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo y, al final, cada valor desconocido de las filas, crudo.
 * - El método, del catálogo completo (`METODO_PAGO_CONFIG`, la misma lista del
 *   alta), con ficha "Método de pago: …".
 * - Proveedor es un valor libre: sus opciones salen de las filas.
 * - La cuenta bancaria es un FK de catálogo: sus opciones salen de las filas,
 *   comparan contra el id crudo y se rotulan con el alias (o `Cuenta #N`), así
 *   dos cuentas con el mismo alias no se mezclan. `cuenta_bancaria` es
 *   obligatorio en el modelo, así que no hay opción "Sin cuenta".
 * - La fecha de pago filtra por mes. Referencia y total no llevan filtro: son
 *   valores libres, los cubren la búsqueda y el orden.
 */
export const PAYMENT_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<Pago>>> = {
  id: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(PAGO_ESTATUS_CONFIG),
  },
  proveedor_nombre: { type: "distinct", get: (r) => r.proveedor_nombre, searchable: true },
  fecha_pago: { type: "month", get: (r) => r.fecha_pago },
  cuenta_bancaria_alias: { type: "distinct", get: (r) => r.cuenta_bancaria, label: getCuentaLabel },
  metodo_pago: {
    type: "options",
    filterLabel: "método de pago",
    get: (r) => r.metodo_pago,
    options: optionsFromConfig(METODO_PAGO_CONFIG),
  },
};
