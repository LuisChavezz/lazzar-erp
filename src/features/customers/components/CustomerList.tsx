"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableVisibleColumn } from "@/src/components/DataTable";
import { hasPermission } from "@/src/utils/permissions";
import { useIsCompanyAdmin } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon, PlusIcon } from "@/src/components/Icons";
import CustomerForm from "./CustomerForm";
import CustomerAddressForm from "./CustomerAddressForm";
import { CustomerAddressList } from "./CustomerAddressList";
import { getCustomerColumns } from "./CustomerColumns";
import { useCustomer } from "../hooks/useCustomer";
import { useCustomersTable } from "../hooks/useCustomersTable";
import { useCustomerCsvExport } from "../hooks/useCustomerCsvExport";
import { useCustomerPdfExport } from "../hooks/useCustomerPdfExport";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { CustomerAddress } from "../interfaces/customer-address.interface";
import { DIALOG_WIDTH_FORM, DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";

/**
 * Listado de clientes de Ventas en MODO SERVIDOR: búsqueda, orden y paginación
 * los resuelve el backend y su estado vive en la URL (`useCustomersTable`), así
 * que la página lo envuelve en `<Suspense>`. El catálogo completo que leen
 * otros módulos (`useCustomers`, llave exacta `["customers"]`) es otra consulta
 * y no cambia.
 */
export const CustomerList = () => {
  const table = useCustomersTable();
  // Exportan TODO lo que cumple la búsqueda vigente (con su orden), no solo la
  // página visible: las filas se piden al backend al hacer clic
  // (`fetchAllRows`). Las columnas son las visibles (`onVisibleColumnsChange`).
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<CustomerListItem>[]>([]);
  useCustomerCsvExport(table.fetchAllRows, visibleColumns);
  useCustomerPdfExport(table.fetchAllRows, visibleColumns);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerListItem | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedCustomerForAddress, setSelectedCustomerForAddress] =
    useState<CustomerListItem | null>(null);
  const [addressToEdit, setAddressToEdit] = useState<CustomerAddress | null>(null);
  const [returnToListAfterAddress, setReturnToListAfterAddress] = useState(false);
  const [isAddressListDialogOpen, setIsAddressListDialogOpen] = useState(false);
  const [selectedCustomerForList, setSelectedCustomerForList] = useState<CustomerListItem | null>(null);

  // Ver el listado exige `R-CRM-CLIENTES` (ver `routePermissions`); dar de alta
  // exige además `C-CRM-CLIENTES`. `hasPermission` cortocircuita para "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-CRM-CLIENTES", session?.user);
  // Las direcciones no tienen código propio en el catálogo: son parte del
  // registro del cliente, así que se rigen por su permiso de EDICIÓN — el mismo
  // que gatea "Editar" y "Agregar Dirección" en el menú de fila.
  const canEdit = hasPermission("E-CRM-CLIENTES", session?.user);
  // Días y límite de crédito: el backend rechaza (400) cambiarlos sin
  // `E-CRM-CLIENTES-CREDITO`. Sin él la sección no se muestra ni en alta ni en
  // edición, y `useCustomerForm` deja esos campos fuera del payload.
  // Misma regla que `tiene_permiso` del backend: superusuario o admin de
  // empresa (`useIsCompanyAdmin`), o el código en la lista. Se decide con las
  // banderas y no con `hasPermission` (`role`): una sesión sin ellas, anterior
  // a que se guardaran, conserva el rol con que se emitió, y aquí falla cerrado.
  const isCompanyAdmin = useIsCompanyAdmin();
  const canEditCredit =
    isCompanyAdmin || (session?.user?.permissions ?? []).includes("E-CRM-CLIENTES-CREDITO");

  const isEditing = Boolean(customerToEdit?.id);

  // La regla del CP de la dirección depende del RFC GUARDADO del cliente, y la
  // fila del listado puede llevar hasta 15 min en caché: al abrir el diálogo se
  // relee el cliente. Mientras llega (o si falla) se usa la fila; el formulario
  // no se desmonta, y si el RFC cambió el backend igual lo marca bajo el campo.
  const queryClient = useQueryClient();
  const { data: freshCustomerForAddress } = useCustomer(
    selectedCustomerForAddress ? String(selectedCustomerForAddress.id) : ""
  );
  const addressCustomerRfc = freshCustomerForAddress?.rfc ?? selectedCustomerForAddress?.rfc ?? "";

  const openAddressFormFor = useCallback(
    (customer: CustomerListItem | null) => {
      // Fuerza la relectura aunque el detalle esté en caché y vigente.
      if (customer) {
        void queryClient.invalidateQueries({ queryKey: ["customer", String(Number(customer.id))] });
      }
      setSelectedCustomerForAddress(customer);
    },
    [queryClient]
  );

  const handleEdit = useCallback((customer: CustomerListItem) => {
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

  const handleAddAddress = useCallback((customer: CustomerListItem) => {
    openAddressFormFor(customer);
    setIsAddressDialogOpen(true);
  }, [openAddressFormFor]);

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
    openAddressFormFor(selectedCustomerForList);
    setIsAddressListDialogOpen(false);
    // Espera a que termine la animacion de cierre antes de abrir el formulario.
    setTimeout(() => setIsAddressDialogOpen(true), 150);
  }, [selectedCustomerForList, openAddressFormFor]);

  // Navega desde el listado al formulario en modo edicion.
  const handleEditAddressFromList = useCallback((address: CustomerAddress) => {
    setAddressToEdit(address);
    setReturnToListAfterAddress(true);
    openAddressFormFor(selectedCustomerForList);
    setIsAddressListDialogOpen(false);
    setTimeout(() => setIsAddressDialogOpen(true), 150);
  }, [selectedCustomerForList, openAddressFormFor]);

  // Callback de éxito del formulario: si vino del listado, reabre el listado.
  const handleAddressFormSuccess = useCallback(() => {
    setIsAddressDialogOpen(false);    setAddressToEdit(null);    if (returnToListAfterAddress) {
      setTimeout(() => setIsAddressListDialogOpen(true), 150);
    }
    setReturnToListAfterAddress(false);
    setSelectedCustomerForAddress(null);
  }, [returnToListAfterAddress]);

  const handleViewAddresses = useCallback((customer: CustomerListItem) => {
    setSelectedCustomerForList(customer);
    setIsAddressListDialogOpen(true);
  }, []);

  const handleAddressListDialogOpenChange = useCallback((open: boolean) => {
    setIsAddressListDialogOpen(open);
    if (!open) {
      setSelectedCustomerForList(null);
    }
  }, []);

  const columns = getCustomerColumns({
    onEdit: handleEdit,
    onAddAddress: handleAddAddress,
    onViewAddresses: handleViewAddresses,
  });

  return (
    <>
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
        maxWidth={DIALOG_WIDTH_FORM}
      >
        {selectedCustomerForAddress && (
          <CustomerAddressForm
            key={addressToEdit?.id ?? "new"}
            customerId={Number(selectedCustomerForAddress.id)}
            customerRfc={addressCustomerRfc}
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
        columns={columns}
        {...table.tableProps}
        // Identidad de la fila por registro, no por posición en la página.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por razón social, nombre, RFC, correo o teléfono..."
        emptyMessage="Aún no hay clientes registrados"
        errorTitle="Error al cargar los clientes"
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
              maxWidth={DIALOG_WIDTH_SECTIONED_FORM}
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
                showCreditFields={canEditCredit}
                onSuccess={() => handleDialogOpenChange(false)}
              />
            </MainDialog>
          </div>
        }
      />
    </>
  );
};
