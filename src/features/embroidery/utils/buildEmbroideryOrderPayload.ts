import type { CreateEmbroideryOrderFormValues } from "../schemas/embroidery-order.schema";
import type { CreateEmbroideryOrderPayload } from "../interfaces/embroidery.interface";

/**
 * Arma el cuerpo de `POST /produccion/orden-bordado/onboarding/` desde los
 * valores del formulario. Mismo rol que `buildTransferPayload` en
 * stock-transfers.
 *
 * Se construye campo por campo A PROPÓSITO (en vez de esparcir el objeto del
 * formulario): así es imposible que un campo `read_only` del backend
 * —`empresa`, `sucursal`, `folio_bordado`, `estatus_bordado`,
 * `usuario_asignado`, `activo`, `fecha_inicio`— se cuele en la petición. El
 * backend los ignoraría en silencio, pero enviarlos sugeriría que el cliente
 * decide algo que no decide. Tampoco viaja `detalles`: el service los deriva
 * del pedido.
 *
 * `observaciones` se omite cuando queda vacío tras recortar espacios: el
 * modelo lo declara `null=True`, así que "sin observaciones" es ausencia del
 * campo, no una cadena vacía.
 */
export function buildEmbroideryOrderPayload(
  values: CreateEmbroideryOrderFormValues,
): CreateEmbroideryOrderPayload {
  const payload: CreateEmbroideryOrderPayload = {
    pedido: values.pedido,
    prioridad: values.prioridad,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;

  return payload;
}
