"use client";

import { useState } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { PurchaseOrder, PurchaseOrderLifecycleStatus } from "../interfaces/purchase-order.interface";
import {
  ViewIcon,
  RouteIcon,
  BellIcon,
  EditIcon,
  PaperPlaneIcon,
  ListaPreciosIcon,
  ReceiptIcon,
} from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { PurchaseOrderTrackingDialog } from "./PurchaseOrderTrackingDialog";

// Configuración visual de cada estado del ciclo de vida
const LIFECYCLE_CFG: Record<
  PurchaseOrderLifecycleStatus,
  { label: string; cls: string; dot: string }
> = {
  borrador: {
    label: "Borrador",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  autorizada: {
    label: "Autorizada",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  en_transito: {
    label: "En tránsito",
    cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  en_aduana: {
    label: "En aduana",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-400",
  },
  en_camino_almacen: {
    label: "En camino",
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  recibida: {
    label: "Recibida",
    cls: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  completada: {
    label: "Completada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-400",
  },
};

// Badge con punto de color para el estado del ciclo de vida
const LifecycleStatusBadge = ({ status }: { status: PurchaseOrderLifecycleStatus }) => {
  const cfg = LIFECYCLE_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

// Célula de acciones — maneja el estado del dialog de rastreo
const ActionsCell = ({ order }: { order: PurchaseOrder }) => {
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Solo órdenes con información de rastreo muestran la opción
  const canTrack = !!order.tracking;
  const lifecycle = order.lifecycle_status;

  // Visibilidad contextual por etapa del ciclo de vida
  const canEditOC = ['borrador', 'pendiente', 'autorizada', 'en_transito'].includes(lifecycle ?? '');
  const canNotifyAgent = ['en_transito', 'en_aduana'].includes(lifecycle ?? '');
  const canSendDocs = ['en_camino_almacen', 'recibida'].includes(lifecycle ?? '');
  const canRequestExpense = ['en_aduana', 'en_camino_almacen'].includes(lifecycle ?? '');
  const canLoadExpenses = ['recibida', 'completada'].includes(lifecycle ?? '');

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => {},
    },
    {
      label: "Modificar OC para Almacén 04",
      icon: EditIcon,
      onSelect: () => {},
      visible: canEditOC,
    },
    {
      label: "Avisar a agente aduanal",
      icon: BellIcon,
      onSelect: () => {},
      visible: canNotifyAgent,
    },
    {
      label: "Enviar correo y documentos a almacén",
      icon: PaperPlaneIcon,
      onSelect: () => {},
      visible: canSendDocs,
    },
    {
      label: "Solicitar cuenta de gastos",
      icon: ListaPreciosIcon,
      onSelect: () => {},
      visible: canRequestExpense,
    },
    {
      label: "Cargar gastos de importación en RC",
      icon: ReceiptIcon,
      onSelect: () => {},
      visible: canLoadExpenses,
    },
    {
      label: "Rastrear fecha de llegada",
      icon: RouteIcon,
      onSelect: () => setIsTrackingOpen(true),
      visible: canTrack,
    },
  ];

  return (
    <>
      <div className="flex justify-center">
        <ActionMenu items={menuItems} />
      </div>
      {canTrack && (
        <PurchaseOrderTrackingDialog
          order={order}
          open={isTrackingOpen}
          onOpenChange={setIsTrackingOpen}
        />
      )}
    </>
  );
};

const columnHelper = createColumnHelper<PurchaseOrder>();

export const getColumns = () => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => {
        const order = info.row.original;
        // Muestra badge de ciclo de vida cuando está disponible
        if (order.lifecycle_status) {
          return <LifecycleStatusBadge status={order.lifecycle_status} />;
        }
        // Fallback al mapeo numérico básico
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
            Estatus {info.getValue()}
          </span>
        );
      },
    }),
    columnHelper.accessor("folio", {
      header: "Folio",
      cell: (info) => (
        <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("proveedor_nombre", {
      header: "Proveedor",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-sm">
          {info.getValue() ?? `Proveedor #${info.row.original.proveedor}`}
        </span>
      ),
    }),
    columnHelper.accessor("referencia", {
      header: "Referencia",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("fecha_oc", {
      header: "Fecha OC",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString("es-MX") : "—"}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_entrega_estimada", {
      header: "Entrega Estimada",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString("es-MX") : "—"}
        </span>
      ),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      cell: (info) => (
        <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
          {Number(info.getValue()).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}
        </span>
      ),
    }),
    columnHelper.accessor("subtotal", {
      header: "Subtotal",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {Number(info.getValue()).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}
        </span>
      ),
    }),
    columnHelper.accessor("impuestos", {
      header: "Impuestos",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {Number(info.getValue()).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}
        </span>
      ),
    }),
    columnHelper.display({
      id: "acciones",
      header: "Acciones",
      cell: (info) => <ActionsCell order={info.row.original} />,
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};

