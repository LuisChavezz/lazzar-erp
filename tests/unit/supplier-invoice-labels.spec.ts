import { expect, test } from "@playwright/test";
import {
  canDownloadMergedPdf,
  facturaLineaProducto,
  facturaLineaReferencias,
  mergedPdfLabel,
  ocFolioLabel,
  SIN_OC_LABEL,
} from "@/src/features/supplier-invoices/utils/supplierInvoiceLabels";
import { mergedPdfFileName } from "@/src/features/supplier-invoices/constants/supplierInvoicePdf";

/** EC-912/EC-919: la factura de maquila de una SM llega con `oc: null`. */

test("folio de la OC, OC #id sin folio, y la SM en la de maquila", () => {
  expect(ocFolioLabel({ oc: 4, oc_folio: "OC-1-207" })).toBe("OC-1-207");
  expect(ocFolioLabel({ oc: 4, oc_folio: null })).toBe("OC #4");
  expect(ocFolioLabel({ oc: null, oc_folio: null, salida_maquila_folio: "SM61-00005" })).toBe("Maquila · SM61-00005");
  expect(ocFolioLabel({ oc: null, oc_folio: null })).toBe(SIN_OC_LABEL);
});

test("el documento fusionado solo pide el PDF adjunto, también sin OC", () => {
  expect(canDownloadMergedPdf({ tiene_pdf_adjunto: true })).toBe(true);
  expect(canDownloadMergedPdf({ tiene_pdf_adjunto: false })).toBe(false);
  expect(mergedPdfLabel({ oc: 4 })).toBe("OC + RC + factura");
  expect(mergedPdfLabel({ oc: null, salida_maquila: 45 })).toBe("SM + RC + factura");
});

test("nombre de respaldo del documento fusionado: el prefijo del backend", () => {
  expect(mergedPdfFileName({ id: 9, folio: "F-1", oc: 4 })).toBe("OC-RC-Factura-F-1.pdf");
  expect(mergedPdfFileName({ id: 1245, folio: null, oc: null, salida_maquila: 45 })).toBe("SM-RC-Factura-1245.pdf");
  expect(mergedPdfFileName({ id: 7, folio: null, oc: null })).toBe("RC-Factura-7.pdf");
});

test("renglón: producto, o la descripción de maquila; nunca #null", () => {
  expect(facturaLineaProducto({ producto: 7, producto_nombre: "CAMISA", descripcion: null })).toBe("CAMISA");
  expect(facturaLineaProducto({ producto: null, producto_nombre: null, descripcion: "BORDADO PECHO" })).toBe(
    "BORDADO PECHO",
  );
  expect(facturaLineaProducto({ producto: 7, producto_nombre: null })).toBe("Producto #7");
  expect(facturaLineaProducto({ producto: null, producto_nombre: null, descripcion: null })).toBe("—");
  expect(facturaLineaReferencias({ oc_detalle: null, recepcion_detalle: 34 })).toBe("— / #34");
  expect(facturaLineaReferencias({ oc_detalle: 12, recepcion_detalle: 34 })).toBe("#12 / #34");
});
