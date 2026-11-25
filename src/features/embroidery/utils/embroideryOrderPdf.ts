/**
 * Reglas puras del PDF de la orden de bordado (EC-857): identidad del
 * documento y las ubicaciones del bordado como TEXTO (el PDF no lleva las
 * imágenes). Sin React ni `@react-pdf/renderer`, para probarlas en `tests/unit/`.
 */
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { cancellationPdfFields } from "@/src/features/document-cancellation/utils/cancellationPdf";
import { EMBROIDERY_STATUS_CANCELLED } from "../constants/embroideryStatus";
import { cleanText } from "@/src/utils/cleanText";
import type {
  EmbroideryOnboardingUbicacion,
  EmbroideryOrderDetail,
  EmbroideryOrderDetailLine,
} from "../interfaces/embroidery.interface";
import { embroideryMedidas, embroideryTechniques } from "./embroideryUbicacion";
import { resolveEmbroideryLineUbicaciones } from "./resolveEmbroideryLineUbicaciones";

/**
 * Identidad de una OB para su PDF. Solo el estatus 8 "Cancelado" lleva la marca
 * de la base, con su motivo, quién y cuándo (`cancelar/`, nucleo-erp#1355,
 * EC-948) si los trae. Una OB dada de baja responde 404 y no llega aquí.
 */
export const embroideryOrderPdfDescriptor = (
  order: Pick<EmbroideryOrderDetail, "id" | "folio_bordado" | "estatus_bordado" | "motivo_cancelacion" | "fecha_cancelacion" | "cancelado_por_nombre">,
): DocumentPdfDescriptor => {
  const cancelled = order.estatus_bordado === EMBROIDERY_STATUS_CANCELLED;
  return {
    type: "OB",
    id: order.id,
    folio: order.folio_bordado,
    cancelled,
    ...cancellationPdfFields(cancelled, order),
  };
};

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
