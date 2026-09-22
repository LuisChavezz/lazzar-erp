"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  DataTable,
  type DataTableHandle,
  type DataTableVisibleColumn,
} from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon, PlusIcon } from "@/src/components/Icons";
import CustomerForm from "./CustomerForm";
import CustomerAddressForm from "./CustomerAddressForm";
import { CustomerAddressList } from "./CustomerAddressList";
import { getCustomerColumns } from "./CustomerColumns";
import { useCustomers } from "../hooks/useCustomers";
import { useCustomerCsvExport } from "../hooks/useCustomerCsvExport";
import { useCustomerPdfExport } from "../hooks/useCustomerPdfExport";
import { Customer } from "../interfaces/customer.interface";
import { CustomerAddress } from "../interfaces/customer-address.interface";

export const CustomerList = () => {
  const { customers, isLoading, isError, error } = useCustomers();
  // Las filas a exportar se LEEN de la tabla al hacer clic (`getFilteredRows`),
  // no se espejean en estado: así el archivo siempre lleva los datos vigentes.
  const tableRef = useRef<DataTableHandle<Customer>>(null);
  const getFilteredCustomers = () => tableRef.current?.getFilteredRows() ?? [];
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Customer>[]>([]);
  useCustomerCsvExport(getFilteredCustomers, visibleColumns);
  useCustomerPdfExport(getFilteredCustomers, visibleColumns);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedCustomerForAddress, setSelectedCustomerForAddress] = useState<Customer | null>(null);
  const [addressToEdit, setAddressToEdit] = useState<CustomerAddress | null>(null);
  const [returnToListAfterAddress, setReturnToListAfterAddress] = useState(false);
  const [isAddressListDialogOpen, setIsAddressListDialogOpen] = useState(false);
  const [selectedCustomerForList, setSelectedCustomerForList] = useState<Customer | null>(null);

  // Ver el listado exige `R-CRM-CLIENTES` (ver `routePermissions`); dar de alta
  // exige además `C-CRM-CLIENTES`. `hasPermission` cortocircuita para "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-CRM-CLIENTES", session?.user);
  // Las direcciones no tienen código propio en el catálogo: son parte del
  // registro del cliente, así que se rigen por su permiso de EDICIÓN — el mismo
  // que gatea "Editar" y "Agregar Dirección" en el menú de fila.
  const canEdit = hasPermission("E-CRM-CLIENTES", session?.user);

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
        {/* Sin permiso de edición el listado de direcciones queda de SOLO
            LECTURA: `CustomerAddressList` oculta su botón "Agregar" y
            `CustomerAddressItem` su botón de editar cuando no reciben callback.
            Sin esto, "Direcciones" —que no exige permiso— sería una vía alterna
            a los mismos formularios que ya gatea el menú de fila. */}
        {selectedCustomerForList && (
          <CustomerAddressList
            customerId={Number(selectedCustomerForList.id)}
            customerName={selectedCustomerForList.razon_social}
            onAddAddress={canEdit ? handleAddAddressFromList : undefined}
            onEditAddress={canEdit ? handleEditAddressFromList : undefined}
          />
        )}
      </MainDialog>

      <DataTable
        ref={tableRef}
        columns={columns}
        data={customers}
        framed
        searchAlwaysExpanded
        defaultPageSize={20}
        density="compact"
        searchPlaceholder="Buscar por razón social, nombre, correo o teléfono..."
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar los clientes"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando clientes"
        onVisibleColumnsChange={setVisibleColumns}
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="success"
              size="icon"
              onClick={() => document.dispatchEvent(new CustomEvent("customers:exportCSV"))}
              title="Exportar a CSV (Excel)"
              aria-label="Exportar clientes a CSV"
            >
              <ExportCsvIcon className="w-4 h-4 shrink-0" />
            </Button>
            <Button
              variant="danger"
              size="icon"
              onClick={() => document.dispatchEvent(new CustomEvent("customers:exportPDF"))}
              title="Exportar a PDF"
              aria-label="Exportar clientes a PDF"
            >
              <ExportPdfIcon className="w-4 h-4 shrink-0" />
            </Button>
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
              // Solo se oculta el TRIGGER, no el diálogo: este mismo `MainDialog`
              // es también el de EDICIÓN (lo abre `handleEdit` desde la fila por
              // `open`, sin pasar por el trigger). Desmontarlo dejaría sin efecto
              // la acción "Editar" de quien tenga E-CRM-CLIENTES pero no
              // C-CRM-CLIENTES.
              trigger={
                canCreate ? (
                  <Button
                    variant="primary"
                    rounded="full"
                    onClick={handleCreateCustomer}
                  >
                    <PlusIcon className="w-4 h-4 shrink-0" />
                    Nuevo Cliente
                  </Button>
                ) : undefined
              }
            >
              <CustomerForm
                customerToEdit={customerToEdit}
                onSuccess={() => handleDialogOpenChange(false)}
              />
            </MainDialog>
          </div>
        }
      />
    </div>
  );
};
