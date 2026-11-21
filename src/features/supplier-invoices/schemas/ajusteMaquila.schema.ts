import { z } from "zod";

/**
 * Importe de una línea en el ajuste de maquila (EC-919): >= 0 y con hasta 2
 * decimales, como `AjusteLineaMaquilaSerializer` (`DecimalField(decimal_places=2,
 * min_value=0)`, nucleo-erp #1242).
 */
export const ajusteImporteSchema = z
  .string()
  .trim()
  .min(1, "Requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Usa un importe de 0 o más, con hasta 2 decimales");
