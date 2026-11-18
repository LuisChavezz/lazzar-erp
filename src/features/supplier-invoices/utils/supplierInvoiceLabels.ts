import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/** Texto de la OC de una factura de maquila, que no tiene OC (EC-912). */
export const SIN_OC_LABEL = "Sin OC (maquila)";

/**
 * Texto de la OC de una factura: su folio, o `OC #id` mientras la OC está en
 * Borrador (`oc_folio` llega `null` hasta que se le asigna folio). La factura
 * de maquila que nace al recibir una SM no tiene OC (`oc: null`, sin
 * `oc_folio`): `SIN_OC_LABEL`.
 */
export const ocFolioLabel = (factura: Pick<FacturaProveedor, "oc" | "oc_folio">): string =>
  factura.oc == null ? SIN_OC_LABEL : factura.oc_folio || `OC #${factura.oc}`;

/**
 * ¿Se puede pedir el documento OC + RC + factura (`pdf-fusionado/`)? Hace
 * falta el PDF del proveedor (sin él el backend da 400) y una OC: sin OC
 * (factura de maquila) el backend truena al pintar la OC.
 */
export const canDownloadMergedPdf = (
  factura: Pick<FacturaProveedor, "oc" | "tiene_pdf_adjunto">,
): boolean => factura.tiene_pdf_adjunto && factura.oc != null;
