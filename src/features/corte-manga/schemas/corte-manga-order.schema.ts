import { z } from "zod";

/**
 * Validación del formulario de alta de orden de corte de manga
 * (`POST /produccion/orden-corte-manga/onboarding/`).
 *
 * `pedido` es lo ÚNICO que el backend exige de verdad —el esquema OpenAPI
 * desplegado lo declara como el único `required` de `OrdenesCorteMangaRequest`—:
 * el service deriva los detalles del pedido elegido, y `observaciones` admite
 * `null` en el modelo.
 *
 * No hay campo de estatus ni de operador que validar: `estatus_corte` y
 * `usuario_asignado` son `read_only` en el serializer y el formulario no los
 * ofrece.
 */
export const CreateCorteMangaOrderFormSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
  observaciones: z.string(),
});

export type CreateCorteMangaOrderFormValues = z.infer<
  typeof CreateCorteMangaOrderFormSchema
>;
