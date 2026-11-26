import { z } from "zod";

/**
 * Validación del formulario de alta de orden de reflejante
 * (`POST /produccion/orden-reflejante/onboarding/`).
 *
 * `pedido` es lo ÚNICO que el backend exige de verdad: el service deriva los
 * detalles del pedido elegido, y `observaciones` admite `null` en el modelo.
 */
export const CreateReflectiveOrderFormSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
  observaciones: z.string(),
});

export type CreateReflectiveOrderFormValues = z.infer<
  typeof CreateReflectiveOrderFormSchema
>;

/**
 * El esquema de `detalles_override` (entero positivo, no vacío, sin ids
 * repetidos) es el compartido con el alta de OCM:
 * `WorkOrderLineOverridesSchema` en `src/utils/workOrderLineQuantities.ts`, que
 * aplica `validateWorkOrderLines` desde el Paso 2. El techo por línea no vive en
 * un esquema: depende de datos del servidor que cambian entre la carga y el
 * envío, y el backend lo revalida con `detalles_exceso`.
 */
