"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ShipmentItem } from "../interfaces/shipment.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const ShipmentStatusBadge = ({ status }: { status: ShipmentItem["status"] }) => {
  const styles: Record<ShipmentItem["status"], string> = {
    Programado: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    "En tránsito": "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    Entregado: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    Incidencia: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const shipmentColumns: ColumnDef<ShipmentItem>[] = [
  {
    accessorKey: "shipmentId",
    header: "Embarque",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("shipmentId")}
      </span>
    ),
  },
  {
    accessorKey: "orderNumber",
    header: "Orden",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("orderNumber")}
      </span>
    ),
  },
  {
    accessorKey: "carrier",
    header: "Transportista",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("carrier")}
      </span>
    ),
  },
  {
    id: "route",
    header: "Ruta",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {row.original.origin}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.original.destination}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "eta",
    header: "ETA",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("eta")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <ShipmentStatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "lastUpdate",
    header: "Última actualización",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("lastUpdate")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => (
      <div className="flex items-center justify-center gap-2">
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Ver Detalles"
        >
          <ViewIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Editar"
        >
          <EditIcon className="w-5 h-5" />
        </button>
      </div>
    ),
  },
];
