/**
 * Construye una etiqueta legible "Producto — Talla — Color" a partir de las
 * tres partes nullables que comparten `EmbroideryOrderDetailLine`,
 * `OrdenBordadoDetalleDisplay` y `ResumenAvancePorDetalle`.
 *
 * Omite las partes vacías/`null` y une con " — ". Si no queda ninguna, cae al
 * guion largo del proyecto. Para la fila legacy del resumen (donde el backend
 * pone todo en `producto_nombre = "Sin talla/SKU asignado (registro antiguo)"`
 * y el resto en `null`) devuelve ese único texto tal cual.
 */
export const buildEmbroiderySkuLabel = (parts: {
  producto_nombre?: string | null;
  talla_nombre?: string | null;
  color_nombre?: string | null;
}): string => {
  const segments = [parts.producto_nombre, parts.talla_nombre, parts.color_nombre]
    .map((value) => (value && value.trim() !== "" ? value.trim() : null))
    .filter((value): value is string => value !== null);

  return segments.length > 0 ? segments.join(" — ") : "—";
};
