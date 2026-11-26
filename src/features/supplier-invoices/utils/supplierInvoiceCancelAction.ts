import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { financeCancelAction, writeCancelledRow } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { cancelSupplierInvoice } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { invalidateSupplierInvoiceQueries } from "../hooks/invalidateSupplierInvoiceQueries";

/**
 * Prefijo de la llave de la cancelación (el id va en el segundo segmento,
 * `selectMutationRecordId`): la lista lee de él las facturas en vuelo.
 */
export const cancelSupplierInvoiceMutationKey = ["cancel-supplier-invoice"] as const;

/**
 * Cómo se retira una factura de proveedor según su estatus (nucleo-erp#1356,
 * EC-950): un `Borrador` se ELIMINA (`DELETE`, lo único que acepta) y una
 * `Registrada` se CANCELA con motivo (`POST cancelar/`); una `Cancelada` ya no
 * admite nada. Lo leen el menú de fila y sus handlers.
 */
export const supplierInvoiceRemoval = (estatus: FacturaProveedor["estatus"]): "delete" | "cancel" | null =>
  estatus === "Borrador" ? "delete" : estatus === "Registrada" ? "cancel" : null;

/** Lo mínimo para cancelar y nombrar la factura. */
export type SupplierInvoiceCancelTarget = Pick<FacturaProveedor, "id" | "folio" | "oc">;

/** Folio para pantalla: el folio o `#id`. */
const label = (factura: Pick<FacturaProveedor, "id" | "folio">) => factura.folio || `#${factura.id}`;

/**
 * "Cancelar factura" de proveedor con motivo
 * (`POST /finanzas/facturas-proveedor/{id}/cancelar/`, nucleo-erp#1356, EC-950;
 * exige `CANCELAR-FIN-PAGOS`). Se ofrece sobre una `Registrada`: su CxP queda
 * `Cancelada` y su póliza con contrapóliza. Con pagos aplicados el backend
 * responde `400` (hay que cancelarlos primero) y se muestra tal cual. Un
 * `Borrador` no se cancela desde la UI: se elimina (`DELETE`).
 */
export const supplierInvoiceCancelDialogContent = (
  factura: SupplierInvoiceCancelTarget,
): CancelDialogContent<FacturaProveedor> => ({
  action: financeCancelAction({
    mutationKey: [...cancelSupplierInvoiceMutationKey, factura.id],
    run: (motivo) => cancelSupplierInvoice(factura.id, motivo),
    applyResult: (queryClient, result) => writeCancelledRow(queryClient, ["facturas-proveedor"], result),
    refresh: (queryClient) => {
      // `Registrada`: también relee las CxP (la suya queda `Cancelada`).
      void invalidateSupplierInvoiceQueries(queryClient, { estatus: "Registrada", oc: factura.oc });
      void queryClient.invalidateQueries({ queryKey: ["polizas"] });
    },
    documentLabel: "la factura de proveedor",
    successMessage: (result) => `Factura ${label(result ?? factura)} cancelada`,
  }),
  title: "Cancelar factura de proveedor",
  description: `La factura ${label(factura)} quedará como Cancelada: su cuenta por pagar se cancela y se genera la contrapóliza de su póliza. Si tiene pagos aplicados, cancélalos primero. Se conserva en el listado. Esta acción no se puede deshacer.`,
  submitLabel: "Cancelar factura",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la factura",
});
