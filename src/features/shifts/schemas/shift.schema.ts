import { z } from "zod";

/** `<input type="time">` produce siempre `"HH:MM"` en 24 horas. */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Objeto base SIN el `refine` cruzado.
 *
 * Se exporta aparte porque `validateForm` valida el objeto completo mientras
 * que `validateField` (en blur) necesita el schema de UN campo vía `.shape`, y
 * un `.refine` de objeto devuelve un `ZodEffects` que ya no expone `.shape`.
 * Mismo desdoblamiento que `RegisterPendingInvoiceObject` en cuentas por
 * cobrar.
 */
const ShiftFormObject = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  hora_entrada: z.string().regex(TIME_REGEX, "La hora de entrada es requerida"),
  hora_salida: z.string().regex(TIME_REGEX, "La hora de salida es requerida"),
  // Lo emite el selector de días en orden canónico; el tope de 50 es el del
  // backend y también acota los valores heredados capturados a mano.
  dias_laborales: z.string().max(50, "Los días laborales no pueden exceder 50 caracteres"),
  tolerancia_retardo_minutos: z.coerce
    .number()
    .int("La tolerancia debe ser un número entero")
    .min(0, "La tolerancia no puede ser negativa"),
  // Decimal(4,2): dos enteros y dos decimales como máximo. String, igual que
  // `salario_base` en puestos, para no perder precisión ni confundir "" con 0.
  horas_base_diarias: z
    .string()
    .refine(
      (value) => value === "" || /^\d{1,2}(\.\d{1,2})?$/.test(value),
      "Horas inválidas (máximo 2 enteros y 2 decimales)"
    ),
  descripcion: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const ShiftFormFields = ShiftFormObject.shape;

/**
 * El backend exige `hora_salida` ESTRICTAMENTE posterior a `hora_entrada`: un
 * turno nocturno es imposible de crear. Se valida aquí para no descubrirlo con
 * un 400.
 *
 * La comparación lexicográfica de `"HH:MM"` en 24 horas coincide con la
 * cronológica, así que `>` basta. El guardia sobre el regex evita que la regla
 * se dispare mientras el formulario está a medio llenar: ahí el mensaje que
 * toca es el del campo vacío, no el del orden.
 */
export const ShiftFormSchema = ShiftFormObject.refine(
  (values) =>
    !TIME_REGEX.test(values.hora_entrada) ||
    !TIME_REGEX.test(values.hora_salida) ||
    values.hora_salida > values.hora_entrada,
  {
    message: "La hora de salida debe ser posterior a la de entrada (el turno no puede cruzar la medianoche)",
    // Sin `path` el issue quedaría a nivel de objeto y `validateForm` —que lee
    // `issue.path[0]`— lo descartaría: el formulario no enviaría y no diría
    // por qué.
    path: ["hora_salida"],
  }
);

export type ShiftFormValues = z.infer<typeof ShiftFormSchema>;
