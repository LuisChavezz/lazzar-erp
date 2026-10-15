import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/**
 * Texto de la OC de una factura: su folio, o `OC #id` mientras la OC está en
 * Borrador (`oc_folio` llega `null` hasta que se le asigna folio).
 */
export const ocFolioLabel = (factura: Pick<FacturaProveedor, "oc" | "oc_folio">): string =>
  factura.oc_folio || `OC #${factura.oc}`;
