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

/** Por qué una lectura por EPC quedó sin asignar (`metadata.motivo`, EC-982). */
export const RFID_READ_MOTIVO_LABELS: Record<string, string> = {
  epc_no_registrado: "EPC no registrado",
  etiqueta_sin_producto: "Etiqueta sin producto",
};

type ReadForReason = Pick<
  RfidReconciliationRead,
  "orden_compra_detalle" | "orden_produccion_detalle" | "producto_nombre" | "producto_variante_nombre" | "metadata"
>;

/**
 * Por qué una lectura no sumó a ningún renglón, o `null` si sí sumó:
 * - `metadata.motivo` del backend: el EPC no es de una etiqueta impresa por el
 *   ERP en la empresa, o la etiqueta no tiene producto;
 * - con producto pero sin renglón: el producto no está en la orden;
 * - lecturas viejas por `codigo_tag` sin producto: código no reconocido.
 */
export const unassignedReadReason = (read: ReadForReason): string | null => {
  if (read.orden_compra_detalle !== null || read.orden_produccion_detalle !== null) return null;
  const motivo = typeof read.metadata?.motivo === "string" ? read.metadata.motivo : null;
  if (motivo) return RFID_READ_MOTIVO_LABELS[motivo] ?? motivo;
  const nombre = read.producto_variante_nombre?.trim() || read.producto_nombre?.trim();
  if (read.metadata?.resolved === false || !nombre) return "Código no reconocido";
  return "No es de esta orden";
};

/**
 * Qué significa una lectura aceptada (`201`). El backend la guarda aunque no
 * encuentre la etiqueta o el producto no esté en la orden: cuenta en "Leído" y
 * en "Sin asignar", pero en ningún renglón.
 */
export const readSuccessFeedback = (read: ReadForReason): RfidReadFeedback => {
  const nombre = read.producto_variante_nombre?.trim() || read.producto_nombre?.trim() || undefined;
  const reason = unassignedReadReason(read);
  if (reason === null) return { tone: "ok", title: "Sumada", detail: nombre };
  return { tone: "warn", title: reason, detail: nombre ? `${nombre} · queda sin asignar` : "Queda sin asignar" };
};

/**
 * Qué hacer con un error de `lecturas/`:
 * - `duplicate`: `400 {"epc"}` (o `{"codigo_tag"}` en el envío obsoleto) con
 *   un TEXTO: la pieza ya está en el encuadre, en cualquier forma equivalente
 *   del EPC o por la misma etiqueta (también con dos envíos simultáneos). Es un
 *   aviso, no un error: la cola sigue. El mismo campo con una LISTA es un error
 *   del serializer (EPC vacío, demasiado largo): `other`.
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
      message: forbiddenDetailMessage(error) ?? "No tienes permiso para leer etiquetas en encuadres.",
    };
  }
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  if (status === 400) {
    const estatus = drfFieldMessage(error, "estatus");
    if (estatus) return { kind: "not-pending", message: estatus };
    // La vista responde el repetido como texto plano; el serializer, en lista.
    const data = (error as AxiosError<Record<string, unknown>>).response?.data;
    for (const field of ["epc", "codigo_tag"] as const) {
      const value = data && typeof data === "object" ? data[field] : undefined;
      if (typeof value === "string" && value.trim()) return { kind: "duplicate", message: value };
    }
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
    ? { tone: "warn", title: "Ya leído", detail: "Esta etiqueta ya está en el encuadre" }
    : { tone: "error", title: "No se registró", detail: message };

/**
 * EPC como lo guarda y compara el backend (`normalizar_epc`): hex en
 * mayúsculas, sin espacios, `:` ni `-`. Solo para comparar localmente: al
 * backend se manda tal como lo entregó la antena.
 */
export const normalizeEpc = (raw: string | null | undefined): string =>
  (raw ?? "").trim().replace(/[\s:-]/g, "").toUpperCase();

/**
 * EPC que el encuadre ya tiene, para no volver a mandarlos: el `codigo_tag` de
 * cada lectura (el EPC canónico de la etiqueta) y `metadata.epc_leido` (la
 * forma en que lo mandó el lector). Una forma distinta de la misma pieza (con
 * o sin relleno) no está aquí: va al backend y vuelve como repetida.
 */
export const knownReadEpcs = (
  lecturas: readonly Pick<RfidReconciliationRead, "codigo_tag" | "metadata">[],
): Set<string> => {
  const known = new Set<string>();
  for (const read of lecturas) {
    const tag = normalizeEpc(read.codigo_tag);
    if (tag) known.add(tag);
    const leido = typeof read.metadata?.epc_leido === "string" ? normalizeEpc(read.metadata.epc_leido) : "";
    if (leido) known.add(leido);
  }
  return known;
};

/** ¿Este EPC ya está en el encuadre o ya se mandó en esta sesión? */
export const isEpcAlreadyRead = (
  epc: string,
  known: ReadonlySet<string>,
  sent: ReadonlySet<string>,
): boolean => {
  const key = normalizeEpc(epc);
  return key !== "" && (known.has(key) || sent.has(key));
};

/** Cuerpo de `POST .../lecturas/`: el EPC tal como lo entregó la antena (EC-982). */
export const readPayload = (epc: string): { epc: string } => ({ epc });
