import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { ordersQueryKey } from "@/src/features/orders/hooks/useOrders";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { createInvoiceFromOnboarding } from "../services/actions";
import type { InvoiceOnboardingPayload } from "../interfaces/invoice-onboarding.interface";
import { invoiceOnboardingQueryKey } from "./useInvoiceOnboarding";

const GENERIC_ERROR = "No se pudo crear la factura. Intenta de nuevo.";

/**
 * Mensaje del backend cuando una talla pide más piezas de las que le quedan
 * ("PLAYERA talla M: pendientes 2, solicitadas 5."). Es la señal de DATO
 * DESACTUALIZADO: otra factura tomó esas piezas entre la carga del paso y el
 * envío. Se recarga el onboarding y se deja reintentar (precedente de picking).
 */
const STALE_PENDING_RE = /pendientes \d+, solicitadas \d+/i;

export interface CreateInvoiceError {
  /** Mensajes del backend, tal cual (puede haber uno por talla rechazada). */
  messages: string[];
  /** ¿Las piezas pendientes cambiaron mientras se capturaba? */
  isStalePending: boolean;
}

/**
 * Junta TODOS los mensajes de un valor de error DRF: string, lista de strings
 * (un mensaje por talla) u objetos anidados (errores de campo de un
 * `ListSerializer`, uno por línea enviada). `firstDrfMessage` solo devuelve el
 * primero, y aquí cada talla rechazada debe verse.
 */
const collectMessages = (value: unknown): string[] => {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectMessages);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectMessages);
  }
  return [];
};

/**
 * Normaliza el error del POST juntando los mensajes de TODO el cuerpo JSON, sea
 * cual sea la llave: los `400` del servicio vienen bajo `factura_detalles` (un
 * mensaje por talla rechazada) o `pedido`, pero la vista también rechaza con
 * `empresa`, `sucursal` o `serie_folio`; un choque de concurrencia llega como
 * `409` con una lista en la raíz; el `404`, con `detail`. Los mensajes se
 * muestran TAL CUAL. Un cuerpo que no es JSON (p. ej. una página HTML de error
 * del servidor) no se muestra: cae al mensaje genérico.
 */
export const parseCreateInvoiceError = (error: unknown): CreateInvoiceError => {
  if (isAxiosError(error)) {
    const data = error.response?.data as unknown;
    const messages = data && typeof data === "object" ? collectMessages(data) : [];
    if (messages.length > 0) {
      return {
        messages,
        isStalePending: messages.some((message) => STALE_PENDING_RE.test(message)),
      };
    }
  }
  return { messages: [GENERIC_ERROR], isStalePending: false };
};

/**
 * Crea una factura parcial (Borrador) desde el onboarding. Tras crearla se
 * refresca lo que cambia: el listado de facturas, lo pendiente por facturar de
 * ESE pedido, y el pedido (su detalle 360° lista sus documentos). Los detalles
 * de factura en caché no se tocan: una factura NUEVA no modifica ninguna
 * existente. Tampoco cuentas por cobrar: un Borrador no genera CxC.
 * El error NO se notifica aquí: el paso lo muestra en línea.
 */
export const useCreateInvoiceFromOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InvoiceOnboardingPayload) =>
      createInvoiceFromOnboarding(payload),
    onSuccess: (invoice, payload) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({
        queryKey: invoiceOnboardingQueryKey(payload.pedido),
      });
      queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(payload.pedido) });
      queryClient.invalidateQueries({ queryKey: pedidoTrazabilidadQueryKey(payload.pedido) });
      // Prefijo: alcanza también las variantes con filtros de la lista.
      queryClient.invalidateQueries({ queryKey: ordersQueryKey() });
      toast.success(`Factura ${invoice.folio} creada como Borrador`);
    },
  });
};
