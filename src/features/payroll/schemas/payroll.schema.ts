import { z } from "zod";
import { stripTrailingDecimalPoint } from "@/src/utils/decimal";
import { getMexicoTodayDate, isCalendarDateKey } from "@/src/utils/mexicoTime";
import { moneyToCents } from "@/src/utils/moneyCents";
import { parseQuincenaKey } from "@/src/utils/quincena";
import {
  CODIGO_MAX_LENGTH,
  CONCEPTO_MAX_LENGTH,
  TIPO_DETALLE_VALUES,
} from "../constants/payrollChoices";

/**
 * Decimal(10,2) del backend: no negativo, hasta 8 enteros y 2 decimales. El
 * punto colgante de una captura a medias ("12.") se tolera.
 */
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const MONEY_MESSAGE = "Debe ser un importe no negativo de hasta 8 enteros y 2 decimales";

const isMoney = (value: string) => MONEY_PATTERN.test(stripTrailingDecimalPoint(value.trim()));

/**
 * Renglón capturable. `cantidad` y `unidad` NO se muestran: un renglón nuevo
 * lleva 1 y "MXN", y uno existente conserva los suyos al reenviar la lista.
 */
export const PayrollLineFormSchema = z.object({
  tipo: z.enum(TIPO_DETALLE_VALUES, { message: "Selecciona el tipo" }),
  codigo: z
    .string()
    .trim()
    .max(CODIGO_MAX_LENGTH, `El código no puede exceder ${CODIGO_MAX_LENGTH} caracteres`),
  concepto: z
    .string()
    .trim()
    .min(1, "El concepto es requerido")
    .max(CONCEPTO_MAX_LENGTH, `El concepto no puede exceder ${CONCEPTO_MAX_LENGTH} caracteres`),
  // Vacío NO es cero: un importe sin capturar se reporta, no se inventa.
  monto: z
    .string()
    .refine((value) => value.trim() !== "", "El monto es requerido")
    .refine((value) => value.trim() === "" || isMoney(value), MONEY_MESSAGE),
  cantidad: z.number().int().nonnegative(),
  unidad: z.string().nullable(),
});

export const PayrollFormSchema = z.object({
  /** 0 = "Seleccionar...". En edición es fijo (solo lectura). */
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  /** Clave de quincena ("2026-10-1"); el rango se deriva, nunca se captura. */
  quincena: z.string().refine((value) => parseQuincenaKey(value) !== null, "Elige la quincena"),
  /** Opcional: vacío viaja como `null`. */
  salario_base: z
    .string()
    .refine((value) => value.trim() === "" || isMoney(value), MONEY_MESSAGE),
  observaciones: z.string(),
  detalles: z.array(PayrollLineFormSchema),
});

export type PayrollLineFormValues = z.infer<typeof PayrollLineFormSchema>;
export type PayrollFormValues = z.infer<typeof PayrollFormSchema>;

export interface PayrollTotals {
  percepciones: number;
  deducciones: number;
  /** percepciones − deducciones; puede ser negativo (el backend lo permite). */
  neto: number;
  /** `false` si algún monto capturado está malformado: los totales no cuentan con él. */
  completo: boolean;
}

/**
 * Totales en CENTAVOS de los renglones capturados, con la misma regla que el
 * servidor (percepciones − deducciones). Un monto vacío cuenta como cero en la
 * vista previa (el envío lo rechaza); uno malformado se excluye y marca
 * `completo: false`.
 */
export const sumPayrollLines = (
  lines: readonly Pick<PayrollLineFormValues, "tipo" | "monto">[]
): PayrollTotals => {
  let percepciones = 0;
  let deducciones = 0;
  let completo = true;
  for (const line of lines) {
    const raw = stripTrailingDecimalPoint(line.monto.trim());
    const cents = raw === "" ? 0 : isMoney(raw) ? moneyToCents(raw) : null;
    if (cents === null) {
      completo = false;
      continue;
    }
    if (line.tipo === "deduccion") {
      deducciones += cents;
    } else {
      percepciones += cents;
    }
  }
  return { percepciones, deducciones, neto: percepciones - deducciones, completo };
};

/**
 * "Marcar como pagada". `today` se resuelve AL VALIDAR (no al cargar el
 * módulo) y siempre en hora de México, nunca la del navegador.
 */
export const createPayPayrollSchema = (today: string = getMexicoTodayDate()) =>
  z.object({
    fecha_pago: z
      .string()
      .min(1, "La fecha de pago es requerida")
      .refine((value) => isCalendarDateKey(value) && value >= "1900-01-01", "Fecha inválida")
      .refine(
        (value) => !isCalendarDateKey(value) || value <= today,
        "La fecha de pago no puede ser posterior a hoy"
      ),
  });
