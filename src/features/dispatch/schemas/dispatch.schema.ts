import { z } from "zod";

/**
 * Esquemas de la captura de despacho.
 *
 * El endpoint es el más pequeño de toda la cadena WMS: no hay encabezado que
 * capturar (ni cajas, ni peso, ni fechas, ni observaciones) ni cantidad por
 * línea. Todo lo que el usuario decide es UN packing y CUÁLES de sus líneas
 * se despachan — de ahí que este archivo sea tan corto comparado con
 * `packing.schema.ts`.
 */

/** Id de packing válido para el query param y para el body. `0` = sin elegir. */
export const DispatchPackingSchema = z.object({
  packing: z.number().int().min(1, "Selecciona un packing"),
});
export type DispatchPackingValues = z.infer<typeof DispatchPackingSchema>;

/**
 * Una línea del body. `packing_detalle` es el único campo aceptado; el
 * backend lo valida con `min_value=1`, así que se replica aquí para no
 * depender de su rechazo tardío.
 */
export const CreateDispatchDetalleLineSchema = z.object({
  packing_detalle: z.number().int().min(1, "Línea de packing inválida"),
});

/**
 * Body completo de `POST /wms/despachos/`.
 *
 * Dos garantías que este schema aporta y que no son decorativas:
 *
 *  1. `min(1)` en `despacho_detalle`: el serializer lo declara con
 *     `allow_empty=True` y el rechazo del arreglo vacío ocurre TARDE, en el
 *     servicio ("Debe enviar al menos una línea para despachar."). Validarlo
 *     aquí evita un viaje al backend por algo que se sabe en el cliente.
 *  2. `z.object` DESCARTA las claves desconocidas al parsear (comportamiento
 *     por defecto de Zod). Al enviar la SALIDA del parseo —y no el objeto
 *     original— queda estructuralmente garantizado que el body solo lleva
 *     `packing` y `despacho_detalle`: `envio` no puede colarse ni por
 *     accidente ni por un cambio futuro que lo agregue río arriba.
 */
export const CreateDispatchPayloadSchema = z.object({
  packing: z.number().int().min(1, "Selecciona un packing"),
  despacho_detalle: z
    .array(CreateDispatchDetalleLineSchema)
    .min(1, "Marca al menos una línea para despachar"),
});
export type CreateDispatchPayloadValues = z.infer<typeof CreateDispatchPayloadSchema>;
