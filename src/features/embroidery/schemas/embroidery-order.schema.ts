import { z } from "zod";

/**
 * Validación del formulario de alta de orden de bordado
 * (`POST /produccion/orden-bordado/onboarding/`).
 *
 * `pedido` es lo ÚNICO que el backend exige de verdad: el service deriva los
 * detalles del pedido elegido, y `prioridad`/`observaciones` tienen default o
 * admiten `null` en el modelo.
 *
 * `prioridad` se valida como entero positivo —no como un enum de tres
 * literales— a propósito, replicando `CreateProductionOrderFormSchema`: el
 * conjunto cerrado 1/2/3 es una convención de PRESENTACIÓN del frontend (vive
 * en las opciones del `<select>`), no una restricción del backend, que declara
 * `prioridad = IntegerField(default=1)` SIN `choices` y acepta cualquier
 * entero. Encerrarla aquí en `z.union([literal(1)…])` inventaría una regla de
 * negocio que nadie ha confirmado.
 */
export const CreateEmbroideryOrderFormSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
  prioridad: z.number().int().positive("Selecciona una prioridad"),
  observaciones: z.string(),
});

export type CreateEmbroideryOrderFormValues = z.infer<
  typeof CreateEmbroideryOrderFormSchema
>;

/**
 * Renglón de `detalles_override` del `POST` — qué línea del pedido entra en la
 * orden y con cuántas piezas.
 *
 * `cantidad` se valida como ENTERO POSITIVO, no como decimal: el backend
 * rechaza los fraccionarios con un `400` (`` `cantidad` debe ser un número
 * entero de piezas ``) porque `PedidoDetalleTalla.cantidad` es un
 * `PositiveIntegerField`. Replicarlo aquí NO inventa una regla —está en el
 * serializer— y le ahorra al usuario el viaje al servidor.
 *
 * NO se valida aquí `cantidad <= cantidad_pendiente`. Ese techo depende de
 * datos del SERVIDOR (lo ya programado por otras OB del mismo pedido) que
 * además cambian entre que se carga el catálogo y se envía el formulario, así
 * que no puede vivir en un esquema estático. Se comprueba contra el
 * `cantidad_pendiente` recién leído del onboarding en tiempo de envío, y el
 * backend lo revalida devolviendo `400` con `detalles_exceso` — exactamente el
 * mismo reparto de responsabilidades que el picking parcial (ver el comentario
 * del Paso 2 en `picking/schemas/picking.schema.ts`).
 */
export const EmbroideryOrderDetalleOverrideSchema = z.object({
  pedido_detalle_talla_id: z
    .number()
    .int()
    .positive("Línea del pedido inválida"),
  cantidad: z
    .number()
    .int("La cantidad debe ser un número entero de piezas")
    .positive("La cantidad debe ser mayor a 0"),
});

export type EmbroideryOrderDetalleOverrideValues = z.infer<
  typeof EmbroideryOrderDetalleOverrideSchema
>;

/**
 * El arreglo completo de `detalles_override`.
 *
 * `nonempty`: mandar `[]` equivaldría a NO mandar el campo (el service hace
 * `data.get("detalles_override") or []` y cae a la ruta del 100% del pedido),
 * así que un arreglo vacío nunca es lo que el usuario quiso decir. Los ids
 * repetidos también los rechaza el backend; se replican aquí para no gastar un
 * viaje.
 */
export const EmbroideryOrderDetallesOverrideSchema = z
  .array(EmbroideryOrderDetalleOverrideSchema)
  .nonempty("Selecciona al menos una línea del pedido")
  .refine(
    (lineas) =>
      new Set(lineas.map((linea) => linea.pedido_detalle_talla_id)).size ===
      lineas.length,
    "Hay líneas del pedido repetidas",
  );
