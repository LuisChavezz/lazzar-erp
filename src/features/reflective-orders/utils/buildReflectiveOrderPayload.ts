import type { CreateReflectiveOrderFormValues } from "../schemas/reflective-order.schema";
import type {
  CreateReflectiveOrderPayload,
  ReflectiveOrderDetalleOverride,
} from "../interfaces/reflective-order.interface";

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
 * algo que no decide. Tampoco viaja `detalles`: es la forma de la RESPUESTA, no
 * del cuerpo.
 *
 * `observaciones` se omite cuando queda vacío tras recortar espacios: el modelo
 * lo declara `null=True`, así que "sin observaciones" es ausencia del campo, no
 * una cadena vacía.
 *
 * `detallesOverride` son las líneas elegidas en el Paso 2. El parámetro es
 * OPCIONAL —y se omite del cuerpo si llega vacío— porque enviar
 * `detalles_override: []` equivale a no enviarlo: el service hace
 * `data.get("detalles_override") or []` y cae a la ruta del pedido completo. Un
 * arreglo vacío que se cuele aquí programaría el 100% del pedido en vez de
 * fallar, que es el peor modo de falla posible; el Paso 2 bloquea ese envío
 * antes de llegar (ver `useReflectiveStep2Form`).
 */
export function buildReflectiveOrderPayload(
  values: CreateReflectiveOrderFormValues,
  detallesOverride?: ReflectiveOrderDetalleOverride[],
): CreateReflectiveOrderPayload {
  const payload: CreateReflectiveOrderPayload = {
    pedido: values.pedido,
    prioridad: values.prioridad,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;

  if (detallesOverride && detallesOverride.length > 0) {
    payload.detalles_override = detallesOverride;
  }

  return payload;
}
