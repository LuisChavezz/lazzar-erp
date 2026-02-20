"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Currency } from "../interfaces/currency.interface";
import { MainDialog } from "../../../components/MainDialog";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteCurrency } from "../hooks/useDeleteCurrency";
import CurrencyForm from "./CurrencyForm";
import { useState } from "react";

const ActionsCell = ({
  currency,
  canEdit,
  canDelete,
}: {
  currency: Currency;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { mutate: deleteCurrency, isPending: isDeleting } = useDeleteCurrency();

  return (
    <div className="flex justify-center gap-2">
      {canEdit ? (
        <MainDialog
          open={open}
          onOpenChange={setOpen}
          maxWidth="1000px"
          title={
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                  Editar Moneda
                </h1>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Información General
                  </p>
                </div>
              </div>
            </div>
          }
          trigger={
            <button
              className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <EditIcon className="w-5 h-5" />
            </button>
          }
        >
          <CurrencyForm
            currencyToEdit={currency}
            onSuccess={() => setOpen(false)}
          />
        </MainDialog>
      ) : null}

      {canDelete ? (
        <ConfirmDialog
          trigger={
            <button
              className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
              title="Eliminar"
              disabled={isDeleting}
            >
              <DeleteIcon className="w-5 h-5" />
            </button>
          }
          title="Eliminar Moneda"
          description={`¿Estás seguro de que deseas eliminar la moneda "${currency.nombre}"? Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
          confirmColor="red"
          onConfirm={() => deleteCurrency(currency.codigo_iso)}
        />
      ) : null}
    </div>
  );
};

export const getCurrencyColumns = ({
  canEdit,
  canDelete,
}: {
  canEdit: boolean;
  canDelete: boolean;
}): ColumnDef<Currency>[] => {
  const columns: ColumnDef<Currency>[] = [
    {
      accessorKey: "codigo_iso",
      header: "Código ISO",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
          {row.getValue("codigo_iso")}
        </span>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {row.getValue("nombre")}
        </span>
      ),
    },
    {
      accessorKey: "simbolo",
      header: "Símbolo",
      cell: ({ row }) => (
        <span className="font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">
          {row.getValue("simbolo")}
        </span>
      ),
    },
    {
      accessorKey: "estatus",
      header: "Estatus",
      cell: ({ row }) => {
        const status = row.getValue("estatus") as boolean;
        const styles = status
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
          >
            {status ? "Activo" : "Inactivo"}
          </span>
        );
      },
    },
  ];

  if (canEdit || canDelete) {
    columns.push({
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <ActionsCell currency={row.original} canEdit={canEdit} canDelete={canDelete} />
      ),
    });
  }

  return columns;
};
