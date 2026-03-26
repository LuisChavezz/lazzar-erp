"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { MainDialog } from "@/src/components/MainDialog";
import CustomerForm from "./CustomerForm";
import { getCustomerColumns } from "./CustomerColumns";
import { useCustomers } from "../hooks/useCustomers";
import { Customer } from "../interfaces/customer.interface";

export const CustomerList = () => {
  const { customers, isLoading } = useCustomers();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const isEditing = Boolean(customerToEdit?.id);

  const handleEdit = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerDialogOpen(true);
  }, []);

  const handleCreateCustomer = useCallback(() => {
    setCustomerToEdit(null);
    setIsCustomerDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsCustomerDialogOpen(open);
    if (!open) {
      setCustomerToEdit(null);
    }
  }, []);

  const columns = useMemo(
    () => getCustomerColumns(handleEdit),
    [handleEdit]
  );

  if (isLoading) {
    return (
      <div className="mt-12 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 p-8">
        <Loader title="Cargando clientes" message="Obteniendo información de clientes..." />
      </div>
    );
  }

  return (
    <div className="mt-12">
      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Buscar por razón social, nombre, correo o teléfono..."
        actionButton={
          <MainDialog
            title={
              <DialogHeader
                title={isEditing ? "Editar Cliente" : "Alta de Cliente"}
                subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isCustomerDialogOpen}
            onOpenChange={handleDialogOpenChange}
            maxWidth="900px"
            trigger={
              <button
                onClick={handleCreateCustomer}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nuevo Cliente
              </button>
            }
          >
            <CustomerForm
              customerToEdit={customerToEdit}
              onSuccess={() => handleDialogOpenChange(false)}
            />
          </MainDialog>
        }
      />
    </div>
  );
};
