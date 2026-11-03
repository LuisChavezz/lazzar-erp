"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, CheckCircleIcon, DeleteIcon, ViewIcon } from "@/src/components/Icons";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatAmountNoCurrency } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { NOTA_CREDITO_ESTATUS_CONFIG } from "../constants/creditNoteStatus";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import {
  CREDIT_NOTE_EMIT_PERMISSION_REASON,
  CREDIT_NOTE_WRITE_PERMISSION_REASON,
  getCreditNoteCancelBlockReason,
} from "../utils/creditNoteStamping";
import {
  CREDIT_NOTE_CFDI_STATE_CONFIG,
  getCreditNoteCfdiState,
  getCreditNoteCfdiStateLabel,
} from "../utils/creditNoteCfdiState";
import { useCreditNoteRowActionsContext } from "../hooks/useCreditNoteRowActions";

// ── Folio: menú de la fila ────────────────────────────────────────────────────

/**
 * Celda del folio: el folio ES el menú de la fila (`FolioActionMenu`) y debajo
 * va su estatus. `folio` puede venir vacío —el backend NO lo autogenera—: se
 * cae al `#id`, que siempre existe. "Ver detalle" es siempre la primera acción.
 *
 * Las acciones solo INVOCAN callbacks, que llegan por
 * `CreditNoteRowActionsProvider`: los diálogos de detalle, emisión, cancelación
 * y borrado se montan en `CreditNoteList`. Una celda se desmonta al ordenar,
 * filtrar o paginar —y las tres mutaciones cambian el `estatus`, que es justo
 * uno de los filtros—, así que un diálogo montado en ella desaparecería a media
 * interacción.
 */
function CreditNoteFolioCell({ nota }: { nota: NotaCredito }) {
  const { onViewDetail, onEmitir, onCancel, onDelete, canWrite } =
    useCreditNoteRowActionsContext();
  const { id, estatus } = nota;
  const isDraft = estatus === "Borrador";
  // Sin permiso de escritura, el motivo del permiso manda sobre el del CFDI.
  const cancelBlockReason = !canWrite
    ? CREDIT_NOTE_WRITE_PERMISSION_REASON
    : estatus !== "Cancelada"
      ? getCreditNoteCancelBlockReason(nota)
      : null;

  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(id) },
    // Emitir y eliminar SOLO sobre borradores: son las dos salidas de un
    // documento que todavía no tiene efecto contable. El backend impone lo
    // mismo (un DELETE sobre una `Emitida` responde 400). Sin el permiso de
    // escritura (`E-FIN-FACTURAS`), las acciones se muestran deshabilitadas con
    // su motivo, convención de este módulo.
    {
      label: "Emitir nota",
      icon: CheckCircleIcon,
      onSelect: () => onEmitir(id),
      visible: isDraft,
      disabled: !canWrite,
      description: canWrite ? undefined : CREDIT_NOTE_EMIT_PERMISSION_REASON,
    },
    // Cancelar sobre lo que aún puede cancelarse. Sobre una `Emitida` devuelve
    // el importe a la cuenta por cobrar; sobre un `Borrador` lo archiva sin
    // tocar saldos. Con CFDI timbrado (o un timbrado pendiente) se muestra
    // deshabilitado con su motivo: el backend no cancela el CFDI ante el SAT y
    // lo dejaría vigente.
    {
      label: "Cancelar nota",
      icon: BanIcon,
      onSelect: () => onCancel(id),
      visible: estatus !== "Cancelada",
      disabled: cancelBlockReason !== null,
      description: cancelBlockReason ?? undefined,
    },
    {
      label: "Eliminar borrador",
      icon: DeleteIcon,
      onSelect: () => onDelete(id),
      visible: isDraft,
      disabled: !canWrite,
      description: canWrite ? undefined : CREDIT_NOTE_WRITE_PERMISSION_REASON,
    },
  ];

  return (
    <FolioActionMenu
      folio={nota.folio || `#${id}`}
      items={items}
      status={<StatusBadge status={estatus} config={NOTA_CREDITO_ESTATUS_CONFIG} />}
    />
  );
}

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<NotaCredito>();

/** Texto del cliente: su nombre resuelto, o `Cliente #N` si llega vacío. */
const getClienteLabel = (nota: NotaCredito): string =>
  nota.cliente_nombre || `Cliente #${nota.cliente}`;

/** Texto de la factura: su folio, o `Factura #N` si llega vacío. */
const getFacturaLabel = (nota: NotaCredito): string =>
  nota.factura_folio || `Factura #${nota.factura}`;

/**
 * Columnas del listado de notas de crédito. No reciben nada: los callbacks del
 * menú llegan por `CreditNoteRowActionsProvider`, así una acción no remonta las
 * celdas.
 */
export const getCreditNoteColumns = () =>
  [
    columnHelper.accessor((row) => row.folio || `#${row.id}`, {
      id: "folio",
      header: "Folio",
      size: 160,
      cell: (info) => <CreditNoteFolioCell nota={info.row.original} />,
    }),
    // El estatus se pinta bajo el folio; esta columna, OCULTA por defecto, lo
    // mantiene en la búsqueda global y en el selector de columnas.
    columnHelper.accessor("estatus", {
      header: "Estatus",
      meta: { hiddenByDefault: true },
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={NOTA_CREDITO_ESTATUS_CONFIG} />
      ),
    }),
    // Estado del CFDI de egreso (`getCreditNoteCfdiState`): independiente del
    // estatus. El valor es el rótulo, así que la búsqueda global lo encuentra.
    columnHelper.accessor((row) => getCreditNoteCfdiStateLabel(row), {
      id: "cfdi",
      header: "CFDI",
      cell: (info) => (
        <StatusBadge
          status={getCreditNoteCfdiState(info.row.original)}
          config={CREDIT_NOTE_CFDI_STATE_CONFIG}
        />
      ),
    }),
    columnHelper.accessor((row) => getFacturaLabel(row), {
      id: "factura_folio",
      header: "Factura",
      cell: (info) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => getClienteLabel(row), {
      id: "cliente_nombre",
      header: "Cliente",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => row.fecha_emision ?? "", {
      id: "fecha_emision",
      header: "Fecha de emisión",
      cell: (info) => {
        const value = info.row.original.fecha_emision;
        return (
          // `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD" — sin esto un
          // navegador al oeste de Greenwich pinta el día anterior. Convención de
          // finanzas (CxC/CxP/pólizas). El campo es nullable en el modelo.
          <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
            {value ? formatShortDate(value, { timeZone: "UTC" }) : "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor((row) => row.motivo ?? "", {
      id: "motivo",
      header: "Motivo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      meta: { align: "right" },
      cell: (info) => (
        // LIMITACIÓN CONOCIDA: `NotaCredito` no expone moneda propia ni el código
        // de la factura, y el renglón del listado no trae con qué resolverla, así
        // que se pinta sin símbolo y con 2 decimales (un "$" afirmaría pesos). El
        // detalle SÍ la resuelve (pide la factura para nombrar sus conceptos y de
        // paso obtiene `moneda_nombre`); esta columna no puede sin una consulta
        // por fila. Mismo caso que el `total_pagado` del listado de pagos.
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatAmountNoCurrency(info.getValue())}
        </div>
      ),
    }),
  ] as ColumnDef<NotaCredito>[];

/**
 * Filtros de encabezado (estilo Excel), para `withHeaderFilters`:
 * - El folio filtra por `estatus` (su badge), con ficha "Estatus: …".
 * - «CFDI» filtra por `getCreditNoteCfdiState`: sus tres estados.
 * - El cliente es un FK: compara contra el id crudo y se rotula con el nombre
 *   (o `Cliente #N`), con buscador.
 */
export const getCreditNoteHeaderFilters = (): Partial<
  Record<string, HeaderFilterSpec<NotaCredito>>
> => ({
  folio: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(NOTA_CREDITO_ESTATUS_CONFIG),
  },
  cfdi: {
    type: "options",
    filterLabel: "CFDI",
    get: (r) => getCreditNoteCfdiState(r),
    options: optionsFromConfig(CREDIT_NOTE_CFDI_STATE_CONFIG),
  },
  cliente_nombre: { type: "distinct", get: (r) => r.cliente, label: getClienteLabel, searchable: true },
});
