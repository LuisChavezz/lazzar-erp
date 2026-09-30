import { z } from "zod";
import { stripTrailingDecimalPoint } from "@/src/utils/decimal";
import { QUALITY_RESULTADO_CAPTURABLE_VALUES } from "../constants/qualityResultado";
import type { QualityResultado } from "../interfaces/quality-inspection.interface";
import {
  isSplittableIntoQualitySteps,
  QUALITY_QUANTITY_REGEX,
  toScaledUnits,
  unitsToQualityString,
} from "../utils/qualityQuantities";

/**
 * Formulario de inspección de Calidad de UNA recepción.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: cada renglón arrastra su
 * `cantidad_recibida` (solo lectura, no viaja al POST) para poder evaluar la
 * suma, y `resultado`/`inspector` usan `""`/`0` como centinela de "sin
 * seleccionar". El mapeo al cuerpo del API vive en `useQualityInspectionForm`.
 *
 * Reglas por renglón (decididas para esta pantalla, más las del backend):
 *
 *  1. `cantidad_aprobada` y `cantidad_rechazada`: hasta 2 decimales; vacío vale 0.
 *  2. No pueden ser ambas 0 (backend: `total <= 0` → 400).
 *  3. Su suma debe ser EXACTAMENTE `cantidad_recibida`. El backend solo exige
 *     `<=`; la igualdad es una regla de esta pantalla. Se compara en enteros
 *     de diezmilésimas (ver `utils/qualityQuantities`).
 *  4. `resultado = rechazo` exige `cantidad_aprobada = 0`.
 *
 * NO hay ninguna otra regla entre `resultado` y las cantidades. `cuarentena` no
 * se acepta en el envío: el backend abona a existencias TODA
 * `cantidad_aprobada > 0` sin mirar el `resultado` (ver `qualityResultado.ts`).
 *
 * Un renglón cuya `cantidad_recibida` trae más de 2 decimales no puede cumplir
 * la regla 3 con cantidades de 2 decimales: se bloquea con un mensaje propio en
 * vez de relajar la regla.
 *
 * Los mensajes de las reglas 2 y 3 (y el del bloqueo por decimales) van en la
 * ruta `lineas.<i>.suma`, que no es un campo: la vista los pinta bajo el
 * renglón completo porque hablan de la combinación, no de un input.
 */

const QUANTITY_FORMAT_MESSAGE = "Cantidad inválida (hasta 2 decimales)";

/**
 * Un campo de cantidad VACÍO vale 0 (decisión de producto): el inspector no
 * tiene que teclear "0" cuando no hay nada que aprobar o rechazar. El payload
 * aplica la misma equivalencia (`toSendableDecimal` → "0.00").
 */
const emptyAsZero = (value: string): string => (value.trim() === "" ? "0" : value);

const quantityField = z
  .string()
  .refine(
    (value) => QUALITY_QUANTITY_REGEX.test(stripTrailingDecimalPoint(emptyAsZero(value))),
    QUANTITY_FORMAT_MESSAGE,
  );

export const QualityInspectionLineSchema = z
  .object({
    recepcion_detalle: z.number().int().positive(),
    cantidad_recibida: z.string(),
    cantidad_aprobada: quantityField,
    cantidad_rechazada: quantityField,
    // Solo los capturables: `cuarentena` (o cualquier otro valor) no se envía.
    resultado: z.union([z.enum(QUALITY_RESULTADO_CAPTURABLE_VALUES), z.literal("")]).refine(
      (value) => value !== "",
      "Selecciona el resultado",
    ),
    motivo_rechazo: z.string(),
  })
  .superRefine((line, ctx) => {
    const recibida = toScaledUnits(line.cantidad_recibida);
    if (recibida === null) {
      ctx.addIssue({
        code: "custom",
        path: ["suma"],
        message: `La cantidad recibida (${line.cantidad_recibida}) no es un número válido.`,
      });
      return;
    }
    if (!isSplittableIntoQualitySteps(recibida)) {
      ctx.addIssue({
        code: "custom",
        path: ["suma"],
        message: `La cantidad recibida (${line.cantidad_recibida}) tiene más de 2 decimales y Calidad solo acepta 2: este renglón no se puede inspeccionar desde aquí.`,
      });
      return;
    }

    const toUnits = (raw: string) => {
      const value = emptyAsZero(raw);
      return QUALITY_QUANTITY_REGEX.test(stripTrailingDecimalPoint(value))
        ? toScaledUnits(value)
        : null;
    };
    const aprobada = toUnits(line.cantidad_aprobada);
    const rechazada = toUnits(line.cantidad_rechazada);

    if (line.resultado === "rechazo" && aprobada !== null && aprobada > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cantidad_aprobada"],
        message: "Con resultado Rechazo la cantidad aprobada debe ser 0",
      });
    }

    // Las reglas de combinación solo se evalúan con ambas cantidades válidas:
    // un formato inválido ya tiene su propio mensaje en su campo.
    if (aprobada === null || rechazada === null) return;

    if (aprobada === 0 && rechazada === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["suma"],
        message: "Captura al menos una cantidad.",
      });
      return;
    }

    if (aprobada + rechazada !== recibida) {
      ctx.addIssue({
        code: "custom",
        path: ["suma"],
        message: `Aprobada + rechazada suman ${unitsToQualityString(aprobada + rechazada)}; deben sumar exactamente lo recibido (${unitsToQualityString(recibida)}).`,
      });
    }
  });

/**
 * Esquema completo. `expectedLineIds` son los renglones de la recepción: el
 * backend exige inspeccionarlos TODOS en un solo envío (ni más ni menos).
 */
export const buildQualityInspectionSchema = (expectedLineIds: number[]) =>
  z
    .object({
      inspector: z.number().int().positive("Selecciona al inspector"),
      observaciones: z.string(),
      lineas: z.array(QualityInspectionLineSchema).min(1, "La recepción no tiene renglones"),
    })
    .superRefine((values, ctx) => {
      const sent = values.lineas.map((line) => line.recepcion_detalle).sort((a, b) => a - b);
      const expected = [...expectedLineIds].sort((a, b) => a - b);
      const sameLines =
        sent.length === expected.length && sent.every((id, index) => id === expected[index]);
      if (!sameLines) {
        ctx.addIssue({
          code: "custom",
          path: ["lineas"],
          message: "Debes inspeccionar todos los renglones de la recepción en un solo envío.",
        });
      }
    });

export type QualityInspectionLineValues = {
  recepcion_detalle: number;
  cantidad_recibida: string;
  cantidad_aprobada: string;
  cantidad_rechazada: string;
  resultado: QualityResultado | "";
  motivo_rechazo: string;
};

export type QualityInspectionFormValues = {
  inspector: number;
  observaciones: string;
  lineas: QualityInspectionLineValues[];
};
