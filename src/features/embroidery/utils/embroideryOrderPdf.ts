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

/** Técnicas de una ubicación, con los rótulos del popover de la pantalla. */
const TECHNIQUES: { key: "dtf" | "sublimado" | "serigrafia" | "revelado" | "nuevo_ponchado"; label: string }[] = [
  { key: "dtf", label: "DTF" },
  { key: "sublimado", label: "Sublimado" },
  { key: "serigrafia", label: "Serigrafía" },
  { key: "revelado", label: "Revelado" },
  { key: "nuevo_ponchado", label: "Nuevo ponchado" },
];

/**
 * Una ubicación del bordado como texto, con los mismos datos y criterios que el
 * popover de la pantalla (`EmbroideryLineLocationPopover`), sin la imagen:
 * código y posición en la primera línea; medidas solo si ambas son positivas;
 * color de hilo, pantones y técnicas solo si traen valor.
 */
export const embroideryUbicacionText = (ubicacion: EmbroideryOnboardingUbicacion): string[] => {
  const codigo = cleanText(ubicacion.codigo);
  const descripcion = cleanText(ubicacion.descripcion_posicion);
  const titulo = [codigo, descripcion].filter(Boolean).join(" · ") || "Ubicación";
  const medidas =
    typeof ubicacion.ancho_cm === "number" &&
    typeof ubicacion.alto_cm === "number" &&
    ubicacion.ancho_cm > 0 &&
    ubicacion.alto_cm > 0
      ? `Medidas: ${ubicacion.ancho_cm} × ${ubicacion.alto_cm} cm`
      : null;
  const colorHilo = cleanText(ubicacion.color_hilo);
  const pantones = cleanText(ubicacion.pantones);
  const tecnicas = TECHNIQUES.filter(({ key }) => ubicacion[key] === true).map(({ label }) => label);
  return [
    titulo,
    medidas,
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
