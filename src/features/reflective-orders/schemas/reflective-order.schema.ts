import { z } from "zod";

/**
 * Validación del formulario de alta de orden de reflejante
 * (`POST /produccion/orden-reflejante/onboarding/`).
 *
 * `pedido` es lo ÚNICO que el backend exige de verdad: el service deriva los
 * detalles del pedido elegido, y `prioridad`/`observaciones` tienen default o
 * admiten `null` en el modelo.
 *
 * `prioridad` se valida como entero positivo —no como un enum de tres
 * literales— a propósito, replicando `CreateEmbroideryOrderFormSchema`: el
 * conjunto cerrado 1/2/3 es una convención de PRESENTACIÓN del frontend (vive
 * en las opciones del `<select>`), no una restricción del backend, que declara
 * `prioridad = IntegerField(default=1)` SIN `choices` y acepta cualquier
 * entero. Encerrarla aquí en `z.union([literal(1)…])` inventaría una regla de
 * negocio que nadie ha confirmado.
 */
export const CreateReflectiveOrderFormSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
  prioridad: z.number().int().positive("Selecciona una prioridad"),
  observaciones: z.string(),
});

export type CreateReflectiveOrderFormValues = z.infer<
  typeof CreateReflectiveOrderFormSchema
>;
