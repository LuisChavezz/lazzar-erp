/**
 * Reglas puras del PDF de la orden de reflejante (EC-857): identidad del
 * documento y la configuración de reflejante de una talla como texto. Sin
 * React ni `@react-pdf/renderer`, para probarlas en `tests/unit/`.
 */
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { cleanText } from "@/src/utils/cleanText";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { isWorkOrderTerminal } from "@/src/utils/workOrderStatusEdit";
import type {
  ReflectiveLineConfigEntry,
  ReflectiveOrderDetail,
  ReflectiveOrderDetailLine,
} from "../interfaces/reflective-order.interface";
import { resolveReflectiveLineConfigs } from "./resolveReflectiveLineConfigs";

/**
 * Identidad de una OR para su PDF. La CANCELADA (7) se sigue pudiendo
 * consultar y lleva la marca de la base, sin motivo (la OR no lo guarda). Una
 * OR dada de baja responde 404 y no llega aquí.
 */
export const reflectiveOrderPdfDescriptor = (
  order: Pick<ReflectiveOrderDetail, "id" | "folio_reflejante" | "estatus_reflejante">,
): DocumentPdfDescriptor => ({
  type: "OR",
  id: order.id,
  folio: order.folio_reflejante,
  cancelled: isWorkOrderTerminal(order.estatus_reflejante),
});

/**
 * Metros como los muestra la página (`metrosOrDash`): un `0` es "nadie lo
 * capturó" —hoy llega `0` en todas las órdenes— y se pinta "—", igual que un
 * valor no finito.
 */
export const reflectiveMetrosText = (metros: number): string =>
  Number.isFinite(metros) && metros !== 0 ? `${formatQuantityValue(metros)} m` : "—";

/**
 * Una entrada de reflejante como texto, con los datos del popover de la
 * pantalla: el material (`tipo`, o "Reflejante" sin él) y, si traen valor, la
 * posición y la opción.
 */
export const reflectiveConfigText = (config: ReflectiveLineConfigEntry): string[] => {
  const posicion = cleanText(config.posicion);
  const opcion = cleanText(config.opcion);
  return [
    cleanText(config.tipo) ?? "Reflejante",
    posicion ? `Posición: ${posicion}` : null,
    opcion ? `Opción: ${opcion}` : null,
  ].filter((text): text is string => text !== null);
};

/**
 * El reflejante de una talla como bloques de texto, uno por entrada, de la
 * misma fuente que la pantalla (`resolveReflectiveLineConfigs`: la foto
 * congelada `configuracion` y, si no hay, `reflejante_config`). `[]` sin nada.
 */
export const reflectiveLineConfigText = (linea: ReflectiveOrderDetailLine): string[][] =>
  resolveReflectiveLineConfigs(linea).map(reflectiveConfigText);
