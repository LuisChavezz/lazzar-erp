import {
  CancelReasonFormSchema,
  type CancelReasonFormValues,
} from "@/src/features/document-cancellation/schemas/cancel-reason.schema";

/**
 * Motivo de una cancelación de WMS o de la reversa de una TR (EC-945): el de
 * toda cancelación con motivo (`CancelReasonFormSchema`, EC-948). OBLIGATORIO,
 * recortado antes de validar y de a lo más 500 code points.
 */
export const WmsCancelFormSchema = CancelReasonFormSchema;

export type WmsCancelFormValues = CancelReasonFormValues;
