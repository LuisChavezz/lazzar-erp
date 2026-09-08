import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  BanIcon,
  CheckCircleIcon,
  DeleteIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { NOTA_CREDITO_ESTATUS_CONFIG } from "../constants/creditNoteStatus";
import type { NotaCredito } from "../interfaces/credit-note.interface";

const columnHelper = createColumnHelper<NotaCredito>();

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
      header: "Folio",
      cell: (info) => (
        // Mismo criterio que el folio en el resto de las tablas: el identificador
        // principal abre el detalle, con la misma llamada que la acción del menú.
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original.id)}
          title="Ver detalle"
          className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {info.getValue() || `#${info.row.original.id}`}
        </button>
      ),
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
      header: () => <div className="text-right">Total</div>,
      cell: (info) => (
        // LIMITACIÓN CONOCIDA: `NotaCredito` no expone moneda propia ni el código
        // de la factura, y el renglón del listado no trae con qué resolverla, así
        // que se formatea con el MXN por defecto de `formatCurrency`. El detalle
        // SÍ la resuelve (pide la factura para nombrar sus conceptos y de paso
        // obtiene `moneda_nombre`); esta columna no puede sin una consulta por
        // fila. Mismo caso que el `total_pagado` del listado de pagos.
        <div className="text-right tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatMoneyValue(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={NOTA_CREDITO_ESTATUS_CONFIG} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const { id, estatus } = row.original;
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

        return (
          <div className="flex justify-center">
            <ActionMenu items={menuItems} />
          </div>
        );
      },
    }),
  ] as ColumnDef<NotaCredito>[];

  return columns;
};
