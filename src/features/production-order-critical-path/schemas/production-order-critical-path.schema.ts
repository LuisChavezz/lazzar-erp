import { z } from "zod";
import { isCalendarDateKey } from "@/src/utils/mexicoTime";
import { ESTATUS_PAQUETE_TECNICO_VALUES } from "../constants/criticalPathChoices";

/**
 * Formulario de la ruta crítica. Los inputs trabajan en string: una fecha o un
 * estatus vacío es "", y se envía como `null` (ver `buildCriticalPathBody`).
 */

export const CANTIDAD_ENTERA_MESSAGE =
  "La cantidad debe ser un número entero de piezas, sin decimales ni negativos.";

/** Fecha opcional: "" o una fecha "yyyy-mm-dd" real. */
const optionalDate = z
  .string()
  .refine((value) => value === "" || isCalendarDateKey(value), "Fecha inválida");

/**
 * `cantidad_real_corte`: vacía, o un número ENTERO no negativo de piezas. El
 * backend guarda decimal(12,2) y acepta negativos; la regla es del cliente. Un
 * valor guardado con fracción ("120.50") llega tal cual al formulario y esta
 * regla pide corregirlo antes de guardar.
 */
const cantidadRealCorte = z
  .string()
  .refine((raw) => raw.trim() === "" || /^\d+$/.test(raw.trim()), CANTIDAD_ENTERA_MESSAGE);

const CriticalPathObject = z.object({
  fecha_liberacion_paquete_tecnico: optionalDate,
  estatus_paquete_tecnico: z.union([z.literal(""), z.enum(ESTATUS_PAQUETE_TECNICO_VALUES)]),
  existencia_tela: z.boolean(),
  sin_existencia_tela: z.boolean(),
  existencia_avios: z.boolean(),
  sin_existencia_avios: z.boolean(),
  fecha_real_surtido_telas: optionalDate,
  fecha_real_surtido_avios: optionalDate,
  corte_externo: z.boolean(),
  comentarios_telas_avios: z.string(),
  kit_completo: z.boolean(),
  fecha_embarque_materia_prima: optionalDate,
  fecha_trazo: optionalDate,
  fecha_real_corte: optionalDate,
  cantidad_real_corte: cantidadRealCorte,
  corte_recibido: z.boolean(),
});

export const criticalPathSchema = CriticalPathObject;

/** Schema de un solo campo, para la validación en blur. */
export const CriticalPathFields = CriticalPathObject.shape;

export type CriticalPathValues = z.infer<typeof CriticalPathObject>;

export type CriticalPathField = keyof CriticalPathValues;

export const CRITICAL_PATH_FORM_FIELDS = Object.keys(CriticalPathFields) as CriticalPathField[];
