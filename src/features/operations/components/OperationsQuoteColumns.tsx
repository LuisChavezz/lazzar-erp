"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  RejectIcon,
  SyncIcon,
  ViewIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { capitalize } from "@/src/utils/capitalize";
import { formatCurrency } from "@/src/utils/formatCurrency";
import {
  canAcceptQuoteChanges as canAcceptOperationsQuoteChangesStatus,
  canManageQuoteAuthorization as canManageOperationsQuoteAuthorization,
} from "../../quotes/utils/quoteStatusRules";
import {
  formatQuoteDateTime as formatOperationsQuoteDateTime,
} from "../../quotes/utils/quoteDetailsFormatters";
import { KANBAN_COLUMNS } from "../../quotes/constants/kanbanColumns";
import { QuoteDetailsLoadingSkeleton } from "../../quotes/components/QuoteDetailsLoadingSkeleton";
import { OperationsQuoteStockReviewDialog } from "./OperationsQuoteStockReviewDialog";
import { useAcceptChangesOperationsQuote } from "../hooks/useAcceptChangesOperationsQuote";
import { useApproveOperationsQuote } from "../hooks/useApproveOperationsQuote";
import { useRejectChangesOperationsQuote } from "../hooks/useRejectChangesOperationsQuote";
import { useRejectOperationsQuote } from "../hooks/useRejectOperationsQuote";
import { OperationsQuote } from "../interfaces/operations-quote.interface";

const OperationsQuoteDetails = dynamic(
  () =>
    import("../../quotes/components/QuoteDetails").then(
      (mod) => mod.QuoteDetails
    ),
  {
    ssr: false,
    loading: () => (
      <QuoteDetailsLoadingSkeleton ariaLabel="Cargando detalle de cotización operativa" />
    ),
  }
);

const operationsQuoteStatusDialogColors: Record<
  number,
  "sky" | "emerald" | "amber" | "rose"
> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

/**
 * Mismo mapeo estatus → color/label que el tablero Kanban de Cotizaciones
 * (Ventas) y su listado (`QuoteColumns.tsx`): reutilizarlo evita una segunda
 * fuente de verdad para los mismos 5 colores en la vista de Mesa de Control.
 */
function getOperationsQuoteStatusConfig(estatus: number) {
  return KANBAN_COLUMNS.find((col) => col.estatus === estatus);
}

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...KANBAN_COLUMNS.map((col) => ({
    value: String(col.estatus),
    label: col.label,
    dotClassName: col.accentDot,
  })),
];

const estatusFilterFn: FilterFn<OperationsQuote> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.estatus) === filterValue;
};

const OperationsQuoteIdCell = ({
  operationsQuote,
}: {
  operationsQuote: OperationsQuote;
}) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isStockReviewOpen, setIsStockReviewOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isAcceptChangesOpen, setIsAcceptChangesOpen] = useState(false);
  const [isRejectChangesOpen, setIsRejectChangesOpen] = useState(false);
  const {
    mutate: authorizeOperationsQuote,
    isPending: isAuthorizingOperationsQuote,
  } = useApproveOperationsQuote();
  const {
    mutate: rejectOperationsQuote,
    isPending: isRejectingOperationsQuote,
  } = useRejectOperationsQuote();
  const {
    mutate: acceptChangesOperationsQuote,
    isPending: isAcceptingChangesOperationsQuote,
  } = useAcceptChangesOperationsQuote();
  const {
    mutate: rejectChangesOperationsQuote,
    isPending: isRejectingChangesOperationsQuote,
  } = useRejectChangesOperationsQuote();

  const canAuthorizeOperationsQuote =
    canManageOperationsQuoteAuthorization(operationsQuote.estatus) &&
    operationsQuote.estatus === 2;
  const canAcceptOperationsQuoteChanges = canAcceptOperationsQuoteChangesStatus(
    operationsQuote.estatus
  );

  const handleOpenAuthorizeDialog = () => {
    if (!canAuthorizeOperationsQuote) return;
    setIsAuthorizeOpen(true);
  };

  const handleOpenRejectDialog = () => {
    if (!canAuthorizeOperationsQuote) return;
    setIsRejectOpen(true);
  };

  const handleOpenAcceptChangesDialog = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    setIsAcceptChangesOpen(true);
  };

  const handleOpenRejectChangesDialog = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    setIsRejectChangesOpen(true);
  };

  const handleAuthorize = () => {
    if (!canAuthorizeOperationsQuote) return;
    authorizeOperationsQuote(operationsQuote.id);
  };

  const handleReject = () => {
    if (!canAuthorizeOperationsQuote) return;
    rejectOperationsQuote(operationsQuote.id);
  };

  const handleAcceptChanges = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    acceptChangesOperationsQuote(operationsQuote.id);
  };

  const handleRejectChanges = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    rejectChangesOperationsQuote(operationsQuote.id);
  };

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
    {
      // Lectura dentro de la sección de cotizaciones: basta el permiso de la
      // propia sección (antes exigía el de MÓDULO, que tras la granularización
      // ya no lo tiene quien solo accede a esta pantalla).
      label: "Revisar inventario",
      icon: WarehouseIcon,
      onSelect: () => setIsStockReviewOpen(true),
      permission: "R-MESACONTROL-COTI",
    },
    {
      // Aprobar/rechazar tienen códigos propios en el catálogo:
      // A-MESACONTROL-COTI y D-MESACONTROL-COTI. `visible` sigue siendo la regla
      // de NEGOCIO (estatus de la cotización); el permiso es independiente.
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: handleOpenAuthorizeDialog,
      disabled: isAuthorizingOperationsQuote || isRejectingOperationsQuote,
      permission: "A-MESACONTROL-COTI",
      visible: canAuthorizeOperationsQuote,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: handleOpenRejectDialog,
      disabled: isRejectingOperationsQuote || isAuthorizingOperationsQuote,
      permission: "D-MESACONTROL-COTI",
      visible: canAuthorizeOperationsQuote,
    },
    {
      // Aceptar/rechazar CAMBIOS es la misma capacidad de aprobación sobre la
      // cotización, aplicada a una revisión: reutiliza los mismos códigos.
      label: "Aceptar cambios",
      icon: SyncIcon,
      onSelect: handleOpenAcceptChangesDialog,
      disabled:
        isAcceptingChangesOperationsQuote || isRejectingChangesOperationsQuote,
      permission: "A-MESACONTROL-COTI",
      visible: canAcceptOperationsQuoteChanges,
    },
    {
      label: "Rechazar cambios",
      icon: RejectIcon,
      onSelect: handleOpenRejectChangesDialog,
      disabled:
        isRejectingChangesOperationsQuote || isAcceptingChangesOperationsQuote,
      permission: "D-MESACONTROL-COTI",
      visible: canAcceptOperationsQuoteChanges,
    },
  ];

  const statusConfig = getOperationsQuoteStatusConfig(operationsQuote.estatus);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig?.accentDot ?? "bg-slate-400"}`}
        role="img"
        aria-label={statusConfig?.label ?? capitalize(operationsQuote.estatus_label)}
        title={statusConfig?.label ?? capitalize(operationsQuote.estatus_label)}
      />
      <ActionMenu
        items={items}
        ariaLabel="Acciones de cotización operativa"
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones de la cotización #${operationsQuote.id}`}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 font-mono font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
          >
            #{String(operationsQuote.id).padStart(5, "0")}
            <ChevronRightIcon
              className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </button>
        }
      />

      {isViewOpen && (
        <MainDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles de la cotización #${operationsQuote.id}`}
              subtitle={
                operationsQuote.cliente_nombre ||
                operationsQuote.cliente_razon_social
              }
              statusColor={
                operationsQuoteStatusDialogColors[operationsQuote.estatus] ??
                "sky"
              }
            />
          }
        >
          <OperationsQuoteDetails
            quoteId={operationsQuote.id}
            source="mesa-control"
          />
        </MainDialog>
      )}

      {/* key={id+open} garantiza que el componente se remonte al abrir/cerrar el di\u00e1logo,
          reseteando el estado de selecciones de producci\u00f3n sin necesitar useEffect. */}
      <OperationsQuoteStockReviewDialog
        key={`stock-review-${operationsQuote.id}-${isStockReviewOpen}`}
        open={isStockReviewOpen}
        onOpenChange={setIsStockReviewOpen}
        operationsQuote={operationsQuote}
      />

      <ConfirmDialog
        open={isAuthorizeOpen && canAuthorizeOperationsQuote}
        onOpenChange={setIsAuthorizeOpen}
        title="Autorizar cotización operativa"
        description={`¿Deseas autorizar la cotización #${operationsQuote.id}?`}
        confirmText={
          isAuthorizingOperationsQuote ? "Autorizando..." : "Autorizar"
        }
        confirmColor="blue"
        onConfirm={handleAuthorize}
      />
      <ConfirmDialog
        open={isRejectOpen && canAuthorizeOperationsQuote}
        onOpenChange={setIsRejectOpen}
        title="Rechazar cotización operativa"
        description={`¿Deseas rechazar la cotización #${operationsQuote.id}?`}
        confirmText={
          isRejectingOperationsQuote ? "Rechazando..." : "Rechazar"
        }
        confirmColor="red"
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={isAcceptChangesOpen && canAcceptOperationsQuoteChanges}
        onOpenChange={setIsAcceptChangesOpen}
        title="Aceptar cambios de la cotización operativa"
        description={`¿Deseas aceptar los cambios de la cotización #${operationsQuote.id}?`}
        confirmText={
          isAcceptingChangesOperationsQuote ? "Aplicando..." : "Aceptar cambios"
        }
        confirmColor="green"
        onConfirm={handleAcceptChanges}
      />
      <ConfirmDialog
        open={isRejectChangesOpen && canAcceptOperationsQuoteChanges}
        onOpenChange={setIsRejectChangesOpen}
        title="Rechazar cambios de la cotización operativa"
        description={`¿Deseas rechazar los cambios de la cotización #${operationsQuote.id}?`}
        confirmText={
          isRejectingChangesOperationsQuote ? "Rechazando..." : "Rechazar cambios"
        }
        confirmColor="red"
        onConfirm={handleRejectChanges}
      />
    </div>
  );
};

export const operationsQuoteColumns: ColumnDef<OperationsQuote>[] = [
  {
    id: "id",
    accessorFn: (operationsQuote) =>
      `#${String(operationsQuote.id).padStart(5, "0")}`,
    meta: { label: "Cotización" },
    filterFn: estatusFilterFn,
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Cotización</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    // Sin columnas separadas de Estado/Acciones: el punto de color (mismo
    // mapeo que el tablero Kanban) y el menú completo cuelgan de este mismo
    // botón, igual que en `QuoteColumns.tsx` (Ventas).
    cell: ({ row }) => <OperationsQuoteIdCell operationsQuote={row.original} />,
  },
  {
    // `accessorFn` normaliza el NULL a cadena vacía: el filtro global de
    // `DataTable` hace `String(valor).includes(...)`, así que un `null` crudo
    // haría que buscar "null" cazara todas las cotizaciones sin pedido.
    id: "pedido_folio",
    accessorFn: (operationsQuote) => operationsQuote.pedido_folio ?? "",
    meta: { label: "Pedido" },
    header: () => <div className="w-full text-center">Pedido</div>,
    cell: ({ row }) =>
      row.original.pedido_folio ? (
        <span className="block text-center font-mono text-slate-600 dark:text-slate-300">
          {row.original.pedido_folio}
        </span>
      ) : (
        <span className="block text-center text-slate-400 dark:text-slate-500">
          —
        </span>
      ),
  },
  {
    accessorKey: "cliente_razon_social",
    meta: { label: "Razón social" },
    header: () => <div className="w-full text-center">Razón social</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-600 dark:text-slate-300">
        {capitalize(row.original.cliente_razon_social)}
      </span>
    ),
  },
  {
    accessorKey: "piezas",
    meta: { label: "Piezas" },
    header: () => <div className="w-full text-center">Piezas</div>,
    size: 80,
    cell: ({ row }) => (
      <span className="block text-center text-slate-500 dark:text-slate-400">
        {row.original.piezas}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { label: "Fecha" },
    header: () => <div className="w-full text-center">Fecha</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-600 dark:text-slate-300">
        {formatOperationsQuoteDateTime(
          row.original.created_at,
          "d MMM yyyy, HH:mm"
        )}
      </span>
    ),
  },
  {
    accessorKey: "importe_sin_iva",
    meta: { label: "Importe sin IVA" },
    header: () => <div className="w-full text-center">Importe sin IVA</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-500 dark:text-slate-400">
        {formatCurrency(Number(row.original.importe_sin_iva) || 0)}
      </span>
    ),
  },
  {
    accessorKey: "gran_total",
    meta: { label: "Total" },
    header: () => <div className="w-full text-center">Total</div>,
    cell: ({ row }) => (
      <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
        {formatCurrency(Number(row.original.gran_total) || 0)}
      </div>
    ),
  },
];