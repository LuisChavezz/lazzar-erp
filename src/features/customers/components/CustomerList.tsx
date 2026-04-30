"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import CustomerForm from "./CustomerForm";
import CustomerAddressForm from "./CustomerAddressForm";
import { CustomerAddressList } from "./CustomerAddressList";
import { getCustomerColumns } from "./CustomerColumns";
import { useCustomers } from "../hooks/useCustomers";
import { Customer } from "../interfaces/customer.interface";
import { CustomerAddress } from "../interfaces/customer-address.interface";

export const CustomerList = () => {
  const { customers, isLoading } = useCustomers();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedCustomerForAddress, setSelectedCustomerForAddress] = useState<Customer | null>(null);
  const [addressToEdit, setAddressToEdit] = useState<CustomerAddress | null>(null);
  const [returnToListAfterAddress, setReturnToListAfterAddress] = useState(false);
  const [isAddressListDialogOpen, setIsAddressListDialogOpen] = useState(false);
  const [selectedCustomerForList, setSelectedCustomerForList] = useState<Customer | null>(null);

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

  const handleAddAddress = useCallback((customer: Customer) => {
    setSelectedCustomerForAddress(customer);
    setIsAddressDialogOpen(true);
  }, []);

  const handleAddressDialogOpenChange = useCallback((open: boolean) => {
    setIsAddressDialogOpen(open);
    if (!open) {
      setSelectedCustomerForAddress(null);
      setAddressToEdit(null);
      setReturnToListAfterAddress(false);
    }
  }, []);

  // Navega desde el listado al formulario: cierra lista y abre formulario.
  const handleAddAddressFromList = useCallback(() => {
    setAddressToEdit(null);
    setReturnToListAfterAddress(true);
    setSelectedCustomerForAddress(selectedCustomerForList);
    setIsAddressListDialogOpen(false);
    // Espera a que termine la animacion de cierre antes de abrir el formulario.
    setTimeout(() => setIsAddressDialogOpen(true), 150);
  }, [selectedCustomerForList]);

  // Navega desde el listado al formulario en modo edicion.
  const handleEditAddressFromList = useCallback((address: CustomerAddress) => {
    setAddressToEdit(address);
    setReturnToListAfterAddress(true);
    setSelectedCustomerForAddress(selectedCustomerForList);
    setIsAddressListDialogOpen(false);
    setTimeout(() => setIsAddressDialogOpen(true), 150);
  }, [selectedCustomerForList]);

  // Callback de éxito del formulario: si vino del listado, reabre el listado.
  const handleAddressFormSuccess = useCallback(() => {
    setIsAddressDialogOpen(false);    setAddressToEdit(null);    if (returnToListAfterAddress) {
      setTimeout(() => setIsAddressListDialogOpen(true), 150);
    }
    setReturnToListAfterAddress(false);
    setSelectedCustomerForAddress(null);
  }, [returnToListAfterAddress]);

  const handleViewAddresses = useCallback((customer: Customer) => {
    setSelectedCustomerForList(customer);
    setIsAddressListDialogOpen(true);
  }, []);

  const handleAddressListDialogOpenChange = useCallback((open: boolean) => {
    setIsAddressListDialogOpen(open);
    if (!open) {
      setSelectedCustomerForList(null);
    }
  }, []);

  const columns = useMemo(
    () => getCustomerColumns(handleEdit, handleAddAddress, handleViewAddresses),
    [handleEdit, handleAddAddress, handleViewAddresses]
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
      {/* Diálogo de creación/edición de dirección de cliente */}
      <MainDialog
        title={
          <DialogHeader
            title={addressToEdit ? "Editar Dirección" : "Agregar Dirección"}
            subtitle={selectedCustomerForAddress?.razon_social ?? "Dirección de envío"}
            statusColor="sky"
          />
        }
        open={isAddressDialogOpen}
        onOpenChange={handleAddressDialogOpenChange}
        maxWidth="680px"
      >
        {selectedCustomerForAddress && (
          <CustomerAddressForm
            key={addressToEdit?.id ?? "new"}
            customerId={Number(selectedCustomerForAddress.id)}
            addressToEdit={addressToEdit}
            onSuccess={handleAddressFormSuccess}
          />
        )}
      </MainDialog>

      {/* Diálogo de listado de direcciones del cliente */}
      <MainDialog
        title={
          <DialogHeader
            title="Direcciones de Envío"
            subtitle={selectedCustomerForList?.razon_social ?? "Listado de direcciones"}
            statusColor="indigo"
          />
        }
        open={isAddressListDialogOpen}
        onOpenChange={handleAddressListDialogOpenChange}
        maxWidth="620px"
      >
        {selectedCustomerForList && (
          <CustomerAddressList
            customerId={Number(selectedCustomerForList.id)}
            customerName={selectedCustomerForList.razon_social}
            onAddAddress={handleAddAddressFromList}
            onEditAddress={handleEditAddressFromList}
          />
        )}
      </MainDialog>

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
              <Button
                variant="primary"
                onClick={handleCreateCustomer}
              >
                + Nuevo Cliente
              </Button>
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
