"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { Button } from "@/src/components/Button";
import { invoiceColumns } from "./InvoiceColumns";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { useInvoices } from "../hooks/useInvoices";

export const InvoiceList = () => {
  const { invoices, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useInvoices();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Ver el listado exige `R-CONTABILIDAD-FACTURACION` (ver `routePermissions`);
  // facturar exige además `C-CONTABILIDAD-FACTURACION`. `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-CONTABILIDAD-FACTURACION", session?.user);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un error de refetch transitorio no debe descartar la
  // tabla ya cargada (perdiendo orden, paginación, búsqueda y filtros del
  // usuario), incluso si el conjunto cargado estaba vacío.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <div className="space-y-6">
      <DataTable
        title="Facturación"
        columns={invoiceColumns}
        data={invoices}
        baseDataCount={invoices.length}
        searchPlaceholder="Buscar por folio, cliente o estatus..."
        onRefetch={refetch}
        isRefetching={isFetching}
        actionButton={
          canCreate ? (
            <Button
              variant="primary"
              rounded="full"
              onClick={() => setIsCreateOpen(true)}
              className="hover:scale-105 active:scale-95"
            >
              + Nueva Factura
            </Button>
          ) : undefined
        }
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las facturas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando facturas"
      />

      <CreateInvoiceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
