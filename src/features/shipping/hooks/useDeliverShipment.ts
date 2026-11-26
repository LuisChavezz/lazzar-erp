import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { pedidoDocumentosQueryKey } from "@/src/features/orders/hooks/usePedidoDocumentos";
import { writeDespachoToPedidoDocumentos } from "@/src/features/orders/utils/orderDespachoCancel";
import { replaceCachedRow } from "@/src/utils/cachedRows";
import {
  forbiddenDetailMessage,
  handleDrfWriteError,
  isForbiddenError,
  isNotFoundError,
} from "@/src/utils/drfWriteErrors";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { hasPermission } from "@/src/utils/permissions";
import { deliverShipment } from "../services/actions";
import type { DeliverShipmentPayload, Shipment } from "../interfaces/shipping.interface";
import type { DeliverShipmentFormField } from "../schemas/shipment-delivery.schema";

/** Permiso con que el backend deja registrar la entrega (el mismo del alta). */
export const SHIPMENT_DELIVER_PERMISSION = "C-WMS-ENVIO";

/** ¿Se ofrece "Entregar"? Con `C-WMS-ENVIO` (`hasPermission` ya deja pasar al rol "admin"). */
export const useCanDeliverShipments = (): boolean => {
  const { data: session } = useSession();
  return hasPermission(SHIPMENT_DELIVER_PERMISSION, session?.user);
};

/** Candado por despacho: frena el doble envío. */
export const deliverShipmentMutationKey = (shipmentId: number) => ["entregar-despacho", shipmentId] as const;

const DELIVER_FALLBACK = "No se pudo registrar la entrega.";
const DELIVER_FORBIDDEN_MESSAGE = "No tienes permiso para registrar entregas.";
const DELIVER_NOT_FOUND_MESSAGE = "Este envío ya no existe o ya no tienes acceso a él.";

/**
 * Campos del backend que el formulario pinta bajo un input: `fecha_entrega` va
 * bajo la hora (es el momento completo) y `recibio` bajo su campo.
 */
const SERVER_FIELD_TO_FORM: Record<string, DeliverShipmentFormField> = {
  fecha_entrega: "hora",
  recibio: "recibio",
};

/**
 * Mensaje de un error de `entregar/` para el banner del diálogo, o `null` si
 * todo quedó bajo sus campos. Los textos del backend van tal cual.
 * - `403` (sin `C-WMS-ENVIO`): su `detail` o un mensaje fijo.
 * - `400` solo de campos (`fecha_entrega` inválida o futura, `recibio`): bajo el
 *   input, sin banner.
 * - `400 {"despacho"}` (cancelado o ya entregado) y cualquier otro: banner.
 * El `404` no pasa por aquí: lo avisa el hook con un toast y el diálogo cierra.
 */
export function parseDeliverShipmentError(
  error: unknown,
  setFieldError: (field: DeliverShipmentFormField, message: string) => void,
): string | null {
  if (isForbiddenError(error)) {
    return forbiddenDetailMessage(error) ?? DELIVER_FORBIDDEN_MESSAGE;
  }
  const data = error instanceof AxiosError && error.response?.status === 400 ? error.response.data : undefined;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>).filter(([, value]) => firstDrfMessage(value));
    if (entries.length > 0 && entries.every(([key]) => Object.hasOwn(SERVER_FIELD_TO_FORM, key))) {
      entries.forEach(([key, value]) => setFieldError(SERVER_FIELD_TO_FORM[key], firstDrfMessage(value) ?? ""));
      return null;
    }
  }
  return handleDrfWriteError(error, DELIVER_FALLBACK, [] as const);
}

/** ¿El backend dice que el despacho ya no admite la entrega? (`400 {"despacho"}`). */
const isDespachoRejection = (error: unknown): boolean => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return false;
  const data = error.response.data;
  return Boolean(data && typeof data === "object" && "despacho" in data);
};

/** El listado de envíos y la bitácora (`ENTREGAR` queda registrado). */
const refreshShipments = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: ["shipments"] });
  void queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
};

/**
 * `POST /wms/despachos/{id}/entregar/` para UN despacho. La respuesta es el
 * `DespachoSerializer`, la forma de la fila del listado: ANTES de invalidar
 * (EC-927) reemplaza la fila en cada variante en caché de `["shipments", …]`
 * —lo que pinta `ShippingDetailDialog`, sin fetch propio— y escribe
 * `fecha_entrega` en los documentos del pedido si están en caché, para que ni
 * el detalle ni la hoja Documentos sigan ofreciendo "Cancelar" si la relectura
 * falla. Entregar no mueve inventario ni toca packing, picking o pedido.
 *
 * Errores: `404` avisa con un toast y relee (el envío ya no está); `400
 * {"despacho"}` relee para que la acción deje de ofrecerse. El diálogo pinta el
 * resto (`parseDeliverShipmentError`).
 */
export const useDeliverShipment = (shipmentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deliverShipmentMutationKey(shipmentId),
    mutationFn: (payload: DeliverShipmentPayload) => deliverShipment({ id: shipmentId, payload }),
    onSuccess: async (shipment: Shipment) => {
      await replaceCachedRow<Shipment>(queryClient, ["shipments"], shipment, [
        "id",
        "estado",
        "packing_folio",
        "fecha_entrega",
        "despacho_detalle",
      ]);
      if (typeof shipment.pedido === "number") {
        await writeDespachoToPedidoDocumentos(queryClient, shipment.pedido, shipment);
        void queryClient.invalidateQueries({ queryKey: pedidoDocumentosQueryKey(shipment.pedido), exact: true });
      }
      refreshShipments(queryClient);
      toast.success(
        shipment.recibio ? `Entrega registrada: recibió ${shipment.recibio}` : "Entrega registrada",
      );
    },
    onError: (error) => {
      if (isNotFoundError(error)) {
        toast.error(DELIVER_NOT_FOUND_MESSAGE);
        refreshShipments(queryClient);
      } else if (isDespachoRejection(error)) {
        refreshShipments(queryClient);
      }
    },
  });
};
