import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { INVENTORY_PIPELINE_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { EMBROIDERY_ORDER_DETAIL_KEY } from "@/src/features/embroidery/hooks/useEmbroideryOrderDetail";
import { PURCHASE_ORDER_RECEIPTS_KEY } from "@/src/features/purchase-order-receipts/hooks/usePurchaseOrderReceiptsTable";
import { QUALITY_INSPECTION_ONBOARDING_KEY } from "@/src/features/quality-inspections/hooks/useQualityInspectionOnboarding";
import { REFLECTIVE_ORDER_DETAIL_KEY } from "@/src/features/reflective-orders/hooks/useReflectiveOrderDetail";
import { cancelReceipt } from "../services/actions";
import { classifyReceiptCancelError } from "../utils/receiptCancelErrors";

/** Lock por recepción: el doble envío lo frena la propia mutación. */
export const cancelReceiptMutationKey = (receiptId: number | null) =>
  ["cancelar-recepcion", receiptId] as const;

/** Las listas y el detalle de recepciones: lo que hay que releer pase lo que pase. */
const invalidateReceiptViews = (queryClient: QueryClient) => {
  // `["receipts"]` cubre también `["receipts","salida-maquila-regreso",…]`.
  queryClient.invalidateQueries({ queryKey: ["receipts"] });
  queryClient.invalidateQueries({ queryKey: ["receipt-detail"] });
  // Listado de Compras y, por prefijo, sus KPIs.
  queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_RECEIPTS_KEY });
};

/**
 * Todo lo que cambia una recepción cancelada (nucleo-erp #1307/EC-926): la
 * recepción pasa a 6, la OC recalcula su estatus, la SM vuelve a Enviada con lo
 * recibido otra vez pendiente y su factura de maquila en Borrador se cancela,
 * sale de la bandeja de Calidad y queda en la bitácora. No mueve existencias
 * (la recepción aún no había entrado a inventario), así que no se tocan las
 * consultas de stock; sí el pipeline, que resta lo recibido de lo pendiente de
 * OC/OP (el mismo que refresca el alta de recepción).
 */
const invalidateAfterCancel = (queryClient: QueryClient) => {
  invalidateReceiptViews(queryClient);
  // La OC/SM vuelve a ofrecerse para recibir.
  queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
  // OC: listado, detalle e historial por proveedor; y su onboarding.
  queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  queryClient.invalidateQueries({ queryKey: ["purchase-order-onboarding"] });
  // OP: lo recibido y sus secciones de SM.
  queryClient.invalidateQueries({ queryKey: ["production-orders"] });
  queryClient.invalidateQueries({ queryKey: ["production-order-onboarding"] });
  // SM (listado, detalle) y su factura de maquila cancelada.
  queryClient.invalidateQueries({ queryKey: ["salidas-maquila"] });
  queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
  // Secciones SM de los detalles de OB/OR abiertos.
  queryClient.invalidateQueries({ queryKey: EMBROIDERY_ORDER_DETAIL_KEY });
  queryClient.invalidateQueries({ queryKey: REFLECTIVE_ORDER_DETAIL_KEY });
  // Calidad: la recepción sale de la bandeja.
  queryClient.invalidateQueries({ queryKey: QUALITY_INSPECTION_ONBOARDING_KEY });
  queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
  queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: INVENTORY_PIPELINE_QUERY_KEY });
};

interface UseCancelReceiptOptions {
  /** Error de `motivo`: se pinta bajo el campo en vez de en un toast. */
  onMotivoError?: (message: string) => void;
}

/**
 * Cancela una recepción (`POST /compras/recepciones/{id}/cancelar/`, EC-925).
 *
 * La respuesta es la forma plana de `RecepcionSerializer`, no la del retrieve:
 * no se escribe en `["receipt-detail", id]`; se invalida y el diálogo la relee
 * (ya con `motivo_cancelacion`, fecha, usuario y `puede_cancelar: false`).
 *
 * Errores (`classifyReceiptCancelError`): `motivo` bajo el campo; cualquier
 * otro, toast con el mensaje del backend tal cual. Si la recepción ya no se
 * puede cancelar (400 `estatus`/`op`/`facturas_proveedores`, o 404) se releen
 * sus vistas para que el botón desaparezca; el diálogo decide cerrarse.
 */
export const useCancelReceipt = (receiptId: number | null, { onMotivoError }: UseCancelReceiptOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: cancelReceiptMutationKey(receiptId),
    mutationFn: (motivo: string) => cancelReceipt({ id: receiptId as number, motivo }),
    onSuccess: () => {
      invalidateAfterCancel(queryClient);
      toast.success("Recepción cancelada correctamente");
    },
    onError: (error) => {
      const classified = classifyReceiptCancelError(error);
      if (classified.kind === "motivo" && onMotivoError) {
        onMotivoError(classified.message);
        return;
      }
      toast.error(classified.message);
      if (classified.kind === "blocked" || classified.kind === "not-found") {
        invalidateReceiptViews(queryClient);
      }
    },
  });
};
