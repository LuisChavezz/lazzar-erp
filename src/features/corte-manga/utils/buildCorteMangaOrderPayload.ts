import type { CreateCorteMangaOrderFormValues } from "../schemas/corte-manga-order.schema";
import type {
  CorteMangaOrderDetalleOverride,
  CreateCorteMangaOrderPayload,
} from "../interfaces/corte-manga-order.interface";

/**
 * Arma el cuerpo de `POST /produccion/orden-corte-manga/onboarding/` desde los
 * valores del formulario. Mismo rol que `buildReflectiveOrderPayload`.
 *
 * Se construye campo por campo A PROPÓSITO (en vez de esparcir el objeto del
 * formulario): así es imposible que se cuele en la petición un campo que el
 * backend no honra — los `read_only` (`empresa`, `sucursal`, `folio_ocm`,
 * `estatus_corte`, `usuario_asignado`, `activo`), el `auto_now_add`
 * (`fecha_inicio`) y `fecha_fin`, que el serializer SÍ acepta pero el service
 * descarta. El backend los ignoraría en silencio, pero enviarlos sugeriría que
 * el cliente decide algo que no decide. Tampoco viaja `detalles`: es la forma de
 * la RESPUESTA, no del cuerpo.
 *
 * `detallesOverride` son las líneas elegidas en el Paso 2. Se omite del cuerpo
 * si llega vacío porque `detalles_override: []` equivale a no enviarlo: el
 * service cae a la ruta del pedido completo, que sobre un pedido programado solo
 * en parte responde 400. El Paso 2 bloquea ese envío antes de llegar (ver
 * `useCorteMangaStep2Form`).
 *
 * `observaciones` se omite cuando queda vacío tras recortar espacios: el modelo
 * lo declara `null=True`, así que "sin observaciones" es ausencia del campo, no
 * una cadena vacía.
 */
export function buildCorteMangaOrderPayload(
  values: CreateCorteMangaOrderFormValues,
  detallesOverride?: CorteMangaOrderDetalleOverride[],
): CreateCorteMangaOrderPayload {
  const payload: CreateCorteMangaOrderPayload = {
    pedido: values.pedido,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;

  if (detallesOverride && detallesOverride.length > 0) {
    payload.detalles_override = detallesOverride;
  }

  return payload;
}
