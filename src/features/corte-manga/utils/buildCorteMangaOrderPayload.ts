import type { CreateCorteMangaOrderFormValues } from "../schemas/corte-manga-order.schema";
import type { CreateCorteMangaOrderPayload } from "../interfaces/corte-manga-order.interface";

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
 * el cliente decide algo que no decide. Tampoco viaja `detalles`: el service los
 * deriva del pedido, uno por talla con `lleva_corte_manga=True` (orden completa,
 * sin selección parcial).
 *
 * `observaciones` se omite cuando queda vacío tras recortar espacios: el modelo
 * lo declara `null=True`, así que "sin observaciones" es ausencia del campo, no
 * una cadena vacía.
 */
export function buildCorteMangaOrderPayload(
  values: CreateCorteMangaOrderFormValues,
): CreateCorteMangaOrderPayload {
  const payload: CreateCorteMangaOrderPayload = {
    pedido: values.pedido,
    prioridad: values.prioridad,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;

  return payload;
}
