/**
 * Reglas puras del PDF de la orden de bordado (EC-857): identidad del
 * documento y las ubicaciones del bordado como TEXTO (el PDF no lleva las
 * imágenes). Sin React ni `@react-pdf/renderer`, para probarlas en `tests/unit/`.
 */
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { cleanText } from "@/src/utils/cleanText";
import type {
  EmbroideryOnboardingUbicacion,
  EmbroideryOrderDetail,
  EmbroideryOrderDetailLine,
} from "../interfaces/embroidery.interface";
import { embroideryMedidas, embroideryTechniques } from "./embroideryUbicacion";
import { resolveEmbroideryLineUbicaciones } from "./resolveEmbroideryLineUbicaciones";

/** `OrdenesBordado.EstatusBordado.CANCELADO_LEGACY` (nucleo-erp, produccion/models.py). */
const EMBROIDERY_ESTATUS_CANCELADO_LEGACY = 8;

/**
 * Identidad de una OB para su PDF. La OB no tiene cancelación propia (la baja
 * es lógica y el detalle responde 404); solo el estatus 8 "Cancelado (legacy)"
 * lleva la marca de la base, sin motivo.
 */
export const embroideryOrderPdfDescriptor = (
  order: Pick<EmbroideryOrderDetail, "id" | "folio_bordado" | "estatus_bordado">,
): DocumentPdfDescriptor => ({
  type: "OB",
  id: order.id,
  folio: order.folio_bordado,
  cancelled: order.estatus_bordado === EMBROIDERY_ESTATUS_CANCELADO_LEGACY,
});

/**
 * Una ubicación del bordado como texto, con los mismos datos y criterios que el
 * popover de la pantalla (`EmbroideryLineLocationPopover`), sin la imagen
 * (medidas y técnicas salen de `embroideryUbicacion`, que comparten ambos):
 * código y posición en la primera línea; medidas solo si ambas son positivas;
 * color de hilo, pantones y técnicas solo si traen valor.
 */
export const embroideryUbicacionText = (ubicacion: EmbroideryOnboardingUbicacion): string[] => {
  const codigo = cleanText(ubicacion.codigo);
  const descripcion = cleanText(ubicacion.descripcion_posicion);
  const titulo = [codigo, descripcion].filter(Boolean).join(" · ") || "Ubicación";
  const medidas = embroideryMedidas(ubicacion);
  const colorHilo = cleanText(ubicacion.color_hilo);
  const pantones = cleanText(ubicacion.pantones);
  const tecnicas = embroideryTechniques(ubicacion).map(({ label }) => label);
  return [
    titulo,
    medidas ? `Medidas: ${medidas}` : null,
    colorHilo ? `Color de hilo: ${colorHilo}` : null,
    pantones ? `Pantones: ${pantones}` : null,
    tecnicas.length > 0 ? `Técnicas: ${tecnicas.join(", ")}` : null,
  ].filter((text): text is string => text !== null);
};

/**
 * El bordado de una talla como bloques de texto, uno por ubicación, de la
 * misma fuente que la pantalla (`resolveEmbroideryLineUbicaciones`: la foto
 * congelada `configuracion` y, si no hay, la lectura en vivo). Sin ubicaciones
 * queda la posición, como en la celda de la pantalla; sin nada, `[]`.
 */
export const embroideryLineBordadoText = (linea: EmbroideryOrderDetailLine): string[][] => {
  const ubicaciones = resolveEmbroideryLineUbicaciones(linea);
  if (ubicaciones.length > 0) return ubicaciones.map(embroideryUbicacionText);
  const posicion = cleanText(linea.posicion_bordado);
  return posicion ? [[`Posición: ${posicion}`]] : [];
};
