"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { Button } from "@/src/components/Button";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { getInvoiceColumns, getInvoiceHeaderFilters } from "./InvoiceColumns";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { InvoiceCancelDialog } from "./InvoiceCancelDialog";
import { InvoiceSendEmailConfirmDialog } from "./InvoiceSendEmailConfirmDialog";
import { canCancelInvoice } from "../utils/invoiceCancellation";
import { INVOICE_WRITE_PERMISSION } from "../constants/invoicePermissions";
import type { InvoiceListRow } from "../interfaces/invoice.interface";
import { useInvoices } from "../hooks/useInvoices";
import {
  InvoiceRowActionsProvider,
  useInvoiceListDocumentActions,
} from "../hooks/useInvoiceListDocumentActions";

export const InvoiceList = () => {
  // Sin las eliminadas (baja lógica): su página de detalle conserva el aviso.
  const { invoices, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useInvoices({ excludeDeleted: true });

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Ver el listado exige `R-CONTABILIDAD-FACTURACION` (ver `routePermissions`);
  // facturar es una escritura de Finanzas y exige `E-FIN-FACTURAS`
  // (`INVOICE_WRITE_PERMISSION`); sin él el botón se oculta. `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission(INVOICE_WRITE_PERMISSION, session?.user);

  // Factura a cancelar. El diálogo vive aquí y no en la celda: al quedar
  // Cancelada, un filtro de estatus puede sacar la fila de la tabla.
  const [invoiceToCancel, setInvoiceToCancel] = useState<InvoiceListRow | null>(null);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un error de refetch transitorio no debe descartar la
  // tabla ya cargada (perdiendo orden, paginación, búsqueda y filtros del
  // usuario), incluso si el conjunto cargado estaba vacío.
  const showError = isInitialLoadError(isError, hasLoaded);

  // PDF y correo del menú de cada fila: una sola instancia, por contexto.
  const { emailDialog, ...documentActions } = useInvoiceListDocumentActions();
  const rowActions = {
    ...documentActions,
    canCancel: (invoice: InvoiceListRow) => canCancelInvoice(invoice, session?.user),
    onCancel: setInvoiceToCancel,
  };

  // Las opciones de los filtros de encabezado se arman con el listado completo.
  const columns = withHeaderFilters(getInvoiceColumns(), invoices, getInvoiceHeaderFilters());

  return (
    <InvoiceRowActionsProvider value={rowActions}>
    <div className="h-full flex flex-col min-h-0 space-y-6">
      <div className="flex-1 min-h-0 flex flex-col">
      <DataTable
        columns={columns}
        data={invoices}
        baseDataCount={invoices.length}
        searchPlaceholder="Buscar por folio, cliente, estatus o CFDI..."
        fillHeight
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
      </div>

      <CreateInvoiceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <InvoiceCancelDialog
        invoice={invoiceToCancel}
        open={invoiceToCancel !== null}
        onOpenChange={(open) => {
          if (!open) setInvoiceToCancel(null);
        }}
      />
      {/* Confirmación del correo: vive aquí y no en la celda, como la
          cancelación. Muestra la foto preparada (`useDialogSession`: sobrevive a la
          animación de cierre), que es lo que se envía. */}
      {emailDialog && (
        <InvoiceSendEmailConfirmDialog key={emailDialog.sessionId} {...emailDialog.props} />
      )}
    </div>
    </InvoiceRowActionsProvider>
  );
};
