import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import {
  BanIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DeleteIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { NOTA_CREDITO_ESTATUS_CONFIG } from "../constants/creditNoteStatus";
import type { NotaCredito } from "../interfaces/credit-note.interface";

const columnHelper = createColumnHelper<NotaCredito>();

/** Opciones del filtro de encabezado, con el mismo punto de color que la celda. */
const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(NOTA_CREDITO_ESTATUS_CONFIG).map(([estatus, cfg]) => ({
    value: estatus,
    label: cfg.label ?? estatus,
    dotClassName: cfg.dot,
  })),
];

/** Filtro EXACTO sobre `estatus` crudo — la celda ya no lo muestra como texto, solo como punto de color. */
const estatusFilterFn: FilterFn<NotaCredito> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.estatus === filterValue;
};

/**
 * Columnas del listado de notas de crédito.
 *
 * `folio` puede venir vacío: el backend NO lo autogenera. Cuando falta se cae al
 * `#id`, que es el identificador que siempre existe.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos de detalle, emisión,
 * cancelación y borrado se montan en `CreditNoteList`, no aquí. Una celda se
 * desmonta al ordenar, filtrar o paginar —y las tres mutaciones cambian el
 * `estatus`, que es justo uno de los filtros—, así que un diálogo montado en la
 * celda desaparecería a media interacción.
 */
export const getColumns = (
  onViewDetail: (id: number) => void,
  onEmitir: (id: number) => void,
  onCancel: (id: number) => void,
  onDelete: (id: number) => void,
) => {
  const columns = [
    columnHelper.accessor("folio", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Folio</span>
          <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: estatusFilterFn,
      cell: (info) => {
        const { id, estatus } = info.row.original;
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(id),
          },
        ];

        // Emitir y eliminar SOLO sobre borradores: son las dos salidas de un
        // documento que todavía no tiene efecto contable. El backend impone lo
        // mismo (un DELETE sobre una `Emitida` responde 400).
        if (estatus === "Borrador") {
          menuItems.push({
            label: "Emitir nota",
            icon: CheckCircleIcon,
            onSelect: () => onEmitir(id),
          });
        }

        // Cancelar sobre lo que aún puede cancelarse. Sobre una `Emitida`
        // devuelve el importe a la cuenta por cobrar; sobre un `Borrador`
        // simplemente lo archiva sin tocar saldos.
        if (estatus !== "Cancelada") {
          menuItems.push({
            label: "Cancelar nota",
            icon: BanIcon,
            onSelect: () => onCancel(id),
          });
        }

        if (estatus === "Borrador") {
          menuItems.push({
            label: "Eliminar borrador",
            icon: DeleteIcon,
            onSelect: () => onDelete(id),
          });
        }

        const folio = info.getValue() || `#${id}`;
        const statusCfg = NOTA_CREDITO_ESTATUS_CONFIG[estatus];
        return (
          // El folio ES el disparador del menú: un solo click en el dato
          // principal reemplaza la columna de Acciones por separado. El
          // estatus se reduce a un punto de color a su izquierda, igual que
          // Pedidos/Cotizaciones — no es parte de la acción.
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg?.dot ?? "bg-slate-400"}`}
              title={statusCfg?.label ?? estatus}
              aria-hidden="true"
            />
            <span className="sr-only">{statusCfg?.label ?? estatus}</span>
            <ActionMenu
              items={menuItems}
              ariaLabel={`Acciones de la nota ${folio}`}
              align="start"
              trigger={
                <button
                  type="button"
                  title="Ver acciones"
                  className="group inline-flex items-center gap-1 cursor-pointer"
                >
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {folio}
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
    columnHelper.accessor("factura_folio", {
      header: "Factura",
      cell: (info) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {info.getValue() || `#${info.row.original.factura}`}
        </span>
      ),
    }),
    columnHelper.accessor("cliente_nombre", {
      header: "Cliente",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_emision", {
      header: "Fecha de emisión",
      cell: (info) => {
        const value = info.getValue();
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
    columnHelper.accessor("motivo", {
      header: "Motivo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      meta: { align: "right" },
      cell: (info) => (
        // LIMITACIÓN CONOCIDA: `NotaCredito` no expone moneda propia ni el código
        // de la factura, y el renglón del listado no trae con qué resolverla, así
        // que se formatea con el MXN por defecto de `formatCurrency`. El detalle
        // SÍ la resuelve (pide la factura para nombrar sus conceptos y de paso
        // obtiene `moneda_nombre`); esta columna no puede sin una consulta por
        // fila. Mismo caso que el `total_pagado` del listado de pagos.
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatMoneyValue(info.getValue())}
        </div>
      ),
    }),
  ] as ColumnDef<NotaCredito>[];

  return columns;
};
