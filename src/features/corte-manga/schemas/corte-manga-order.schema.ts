import { z } from "zod";

/**
 * Validación del formulario de alta de orden de corte de manga
 * (`POST /produccion/orden-corte-manga/onboarding/`).
 *
 * `pedido` es lo ÚNICO que el backend exige de verdad —el esquema OpenAPI
 * desplegado lo declara como el único `required` de `OrdenesCorteMangaRequest`—:
 * el service deriva los detalles del pedido elegido, y `prioridad`/
 * `observaciones` tienen default o admiten `null` en el modelo.
 *
 * `prioridad` se valida como entero positivo —no como un enum de tres
 * literales— a propósito, replicando `CreateReflectiveOrderFormSchema`: el
 * conjunto cerrado 1/2/3 es una convención de PRESENTACIÓN del frontend (vive
 * en las opciones del `<select>`), no una restricción del backend, que declara
 * `prioridad = IntegerField(default=1)` SIN `choices` y acepta cualquier entero
 * (el esquema lo confirma: `integer` con los límites de un `int32`, sin enum).
 * Encerrarla aquí en `z.union([literal(1)…])` inventaría una regla de negocio
 * que nadie ha confirmado.
 *
 * No hay campo de estatus ni de operador que validar: `estatus_corte` y
 * `usuario_asignado` son `read_only` en el serializer y el formulario no los
 * ofrece.
 */
export const CreateCorteMangaOrderFormSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
  prioridad: z.number().int().positive("Selecciona una prioridad"),
  observaciones: z.string(),
});

export type CreateCorteMangaOrderFormValues = z.infer<
  typeof CreateCorteMangaOrderFormSchema
>;
