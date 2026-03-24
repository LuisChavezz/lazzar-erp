"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ReportItem } from "../interfaces/report.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

const ReportStatusBadge = ({ status }: { status: ReportItem["status"] }) => {
  const styles: Record<ReportItem["status"], string> = {
    Programado: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    "En proceso": "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    Generado: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    Fallido: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

const ActionsCell = () => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => {},
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => {},
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

export const reportColumns: ColumnDef<ReportItem>[] = [
  {
    accessorKey: "name",
    header: "Reporte",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("name")}
      </span>
    ),
  },
  {
    accessorKey: "category",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("category")}
      </span>
    ),
  },
  {
    accessorKey: "owner",
    header: "Responsable",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("owner")}
      </span>
    ),
  },
  {
    accessorKey: "schedule",
    header: "Frecuencia",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("schedule")}
      </span>
    ),
  },
  {
    accessorKey: "lastRun",
    header: "Última ejecución",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("lastRun")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <ReportStatusBadge status={row.getValue("status")} />,
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => <ActionsCell />,
  },
];
