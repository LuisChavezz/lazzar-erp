import { AxiosError } from "axios";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { forbiddenDetailMessage, isForbiddenError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { RfidReconciliationRead } from "../interfaces/rfid-reconciliation.interface";

/** Cómo se pinta una lectura en la lista de lecturas de la sesión. */
export type RfidReadTone = "pending" | "ok" | "warn" | "error";

export interface RfidReadFeedback {
  tone: RfidReadTone;
  title: string;
  detail?: string;
}

/**
 * Qué significa una lectura aceptada (`201`). El backend la guarda aunque no
 * encuentre el producto o el producto no esté en la orden: cuenta en "Leído" y
 * en "Sin asignar", pero en ningún renglón.
 */
export const readSuccessFeedback = (read: Pick<
  RfidReconciliationRead,
  "orden_compra_detalle" | "orden_produccion_detalle" | "producto_nombre" | "producto_variante_nombre" | "metadata"
>): RfidReadFeedback => {
  const nombre = read.producto_variante_nombre?.trim() || read.producto_nombre?.trim() || undefined;
  if (read.orden_compra_detalle !== null || read.orden_produccion_detalle !== null) {
    return { tone: "ok", title: "Sumada", detail: nombre };
  }
  if (read.metadata?.resolved === false || !nombre) {
    return { tone: "warn", title: "Código no reconocido", detail: "Queda sin asignar" };
  }
  return { tone: "warn", title: "No es de esta orden", detail: `${nombre} · queda sin asignar` };
};

/**
 * Qué hacer con un error de `lecturas/`:
 * - `duplicate`: `400 {"codigo_tag"}`, el tag ya está en el encuadre (también
 *   con dos envíos simultáneos). Es un aviso, no un error: la cola sigue.
 * - `not-pending`: `400 {"estatus"}`, el encuadre se aceptó o canceló en otro
 *   lado. Se detiene la cola y se relee el detalle.
 * - `not-found` (`404`): el encuadre ya no está a la vista. Igual que el anterior.
 * - `forbidden` (`403`, sin `C-WMS-RECEPCIONES`): se detiene la cola.
 * - `other`: red, 5xx u otro `400`; solo esa lectura falla.
 */
export type RfidReadErrorKind = "duplicate" | "not-pending" | "not-found" | "forbidden" | "other";

export const classifyReadError = (error: unknown): { kind: RfidReadErrorKind; message: string } => {
  if (isNotFoundError(error)) {
    return { kind: "not-found", message: "El encuadre ya no está disponible." };
  }
  if (isForbiddenError(error)) {
    return {
      kind: "forbidden",
      message: forbiddenDetailMessage(error) ?? "No tienes permiso para escanear encuadres.",
    };
  }
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  if (status === 400) {
    const estatus = drfFieldMessage(error, "estatus");
    if (estatus) return { kind: "not-pending", message: estatus };
    const tag = drfFieldMessage(error, "codigo_tag");
    if (tag) return { kind: "duplicate", message: tag };
  }
  return {
    kind: "other",
    message: (status === 400 ? firstDrfFieldMessage(error) : undefined) ??
      extractErrorMessage(error, "No se pudo registrar la lectura."),
  };
};

/** El aviso de un error de lectura en la lista de la sesión. */
export const readErrorFeedback = (kind: RfidReadErrorKind, message: string): RfidReadFeedback =>
  kind === "duplicate"
    ? { tone: "warn", title: "Ya leído", detail: "Este código ya está en el encuadre" }
    : { tone: "error", title: "No se registró", detail: message };

/** El código como lo guarda el backend (`codigo_tag.strip()`); `""` = nada que enviar. */
export const normalizeTag = (raw: string): string => raw.trim();
