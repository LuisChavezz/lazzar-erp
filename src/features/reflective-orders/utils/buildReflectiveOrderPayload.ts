import type { CreateReflectiveOrderFormValues } from "../schemas/reflective-order.schema";
import type { CreateReflectiveOrderPayload } from "../interfaces/reflective-order.interface";

/**
 * Arma el cuerpo de `POST /produccion/orden-reflejante/onboarding/` desde los
 * valores del formulario. Mismo rol que `buildEmbroideryOrderPayload`.
 *
 * Se construye campo por campo A PROPÓSITO (en vez de esparcir el objeto del
 * formulario): así es imposible que se cuele en la petición un campo que el
 * backend no honra — los `read_only` (`empresa`, `sucursal`,
 * `folio_reflejante`, `usuario_asignado`, `activo`), el `auto_now_add`
 * (`fecha_inicio`) y, particularmente en reflejante, `estatus_reflejante` y
 * `fecha_fin`, que el serializer SÍ acepta pero el service descarta. El backend
 * los ignoraría en silencio, pero enviarlos sugeriría que el cliente decide
 * algo que no decide. Tampoco viaja `detalles`: el service los deriva del
 * pedido.
 *
 * `observaciones` se omite cuando queda vacío tras recortar espacios: el modelo
 * lo declara `null=True`, así que "sin observaciones" es ausencia del campo, no
 * una cadena vacía.
 */
export function buildReflectiveOrderPayload(
  values: CreateReflectiveOrderFormValues,
): CreateReflectiveOrderPayload {
  const payload: CreateReflectiveOrderPayload = {
    pedido: values.pedido,
    prioridad: values.prioridad,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;

  return payload;
}
