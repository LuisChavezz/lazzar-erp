import type {
  FacturaProveedor,
  FacturaProveedorDetalle,
} from "../interfaces/supplier-invoice.interface";

/** Texto de la OC de una factura de maquila, que no tiene OC (EC-912). */
export const SIN_OC_LABEL = "Sin OC (maquila)";

/**
 * Texto de la OC de una factura: su folio, o `OC #id` mientras la OC está en
 * Borrador (`oc_folio` llega `null` hasta que se le asigna folio). La factura
 * de maquila que nace al recibir una SM no tiene OC (`oc: null`): se nombra
 * por su SM, "Maquila · SM-00022" (`salida_maquila_folio`, EC-919), o
 * `SIN_OC_LABEL` si no llegó.
 */
export const ocFolioLabel = (
  factura: Pick<FacturaProveedor, "oc" | "oc_folio"> & Partial<Pick<FacturaProveedor, "salida_maquila_folio">>,
): string => {
  if (factura.oc != null) return factura.oc_folio || `OC #${factura.oc}`;
  const sm = factura.salida_maquila_folio?.trim();
  return sm ? `Maquila · ${sm}` : SIN_OC_LABEL;
};

/**
 * ¿Se puede pedir el documento fusionado (`pdf-fusionado/`)? Hace falta el PDF
 * del proveedor (sin él el backend da 400). Desde nucleo-erp #1233 funciona
 * también sin OC: la factura de maquila lleva la portada de su SM.
 */
export const canDownloadMergedPdf = (factura: Pick<FacturaProveedor, "tiene_pdf_adjunto">): boolean =>
  factura.tiene_pdf_adjunto;

/**
 * Qué junta el documento fusionado, para botones y avisos: "OC + RC + factura",
 * o "SM + RC + factura" en la de maquila (mismo prefijo que el archivo del
 * backend).
 */
export const mergedPdfLabel = (
  factura: Pick<FacturaProveedor, "oc"> & Partial<Pick<FacturaProveedor, "salida_maquila">>,
): string =>
  factura.oc != null ? "OC + RC + factura" : factura.salida_maquila != null ? "SM + RC + factura" : "RC + factura";

/** ¿Factura de maquila de una SM? (nace al recibirla en WMS, EC-912). */
export const isFacturaMaquila = (factura: Partial<Pick<FacturaProveedor, "salida_maquila">>): boolean =>
  factura.salida_maquila != null;

/**
 * Qué se facturó en un renglón: el nombre del producto, o la `descripcion` del
 * renglón de maquila sin producto (SM de OB/OR, nucleo-erp #1242). Nunca
 * "#null".
 */
export const facturaLineaProducto = (
  linea: Pick<FacturaProveedorDetalle, "producto" | "producto_nombre" | "descripcion">,
): string =>
  linea.producto_nombre?.trim() ||
  linea.descripcion?.trim() ||
  (linea.producto != null ? `Producto #${linea.producto}` : "—");

/** "#12 / #34": renglón de la OC y de la recepción; "—" en el que falte (maquila sin OC). */
export const facturaLineaReferencias = (
  linea: Pick<FacturaProveedorDetalle, "oc_detalle" | "recepcion_detalle">,
): string =>
  [linea.oc_detalle, linea.recepcion_detalle].map((id) => (id != null ? `#${id}` : "—")).join(" / ");
