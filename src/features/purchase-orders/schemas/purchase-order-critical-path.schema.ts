import { z } from "zod";
import { isCompleteDateEntry } from "@/src/utils/formatDate";

/**
 * Formulario de la ruta crítica de la OC. Los inputs trabajan en string: una
 * fecha o un comentario vacío es "", y se envía como `null` (ver
 * `buildPurchaseOrderCriticalPathBody`).
 */

export const CRITICAL_PATH_COMENTARIOS_MAX = 2000;

const ComentariosMaxMessage = `El comentario no puede exceder ${CRITICAL_PATH_COMENTARIOS_MAX} caracteres.`;

const PurchaseOrderCriticalPathObject = z.object({
  /**
   * "" o una fecha "yyyy-mm-dd" real y COMPLETA. El piso de 1900 de
   * `isCompleteDateEntry` descarta los años a medio teclear que emite el
   * `<input type="date">` ("0020-10-14"): el backend los guardaría tal cual.
   */
  fecha_real_recibo: z
    .string()
    .refine((value) => value === "" || isCompleteDateEntry(value), "Fecha inválida"),
  /**
   * Se mide RECORTADO, igual que el backend (`CharField` de DRF recorta antes
   * de validar `max_length`): los espacios sobrantes no cuentan.
   */
  comentarios: z
    .string()
    .refine((value) => value.trim().length <= CRITICAL_PATH_COMENTARIOS_MAX, ComentariosMaxMessage),
});

export const purchaseOrderCriticalPathSchema = PurchaseOrderCriticalPathObject;

/** Schema de un solo campo, para la validación en blur. */
export const PurchaseOrderCriticalPathFields = PurchaseOrderCriticalPathObject.shape;

export type PurchaseOrderCriticalPathValues = z.infer<typeof PurchaseOrderCriticalPathObject>;

export type PurchaseOrderCriticalPathField = keyof PurchaseOrderCriticalPathValues;

export const PURCHASE_ORDER_CRITICAL_PATH_FORM_FIELDS = Object.keys(
  PurchaseOrderCriticalPathFields,
) as PurchaseOrderCriticalPathField[];
