import { expect, test } from "@playwright/test";
import {
  canDownloadMergedPdf,
  ocFolioLabel,
  SIN_OC_LABEL,
} from "@/src/features/supplier-invoices/utils/supplierInvoiceLabels";

/** EC-912: la factura de maquila de una SM llega con `oc: null` y sin `oc_folio`. */

test("folio de la OC, OC #id sin folio y Sin OC para la factura de maquila", () => {
  expect(ocFolioLabel({ oc: 4, oc_folio: "OC-1-207" })).toBe("OC-1-207");
  expect(ocFolioLabel({ oc: 4, oc_folio: null })).toBe("OC #4");
  expect(ocFolioLabel({ oc: null })).toBe(SIN_OC_LABEL);
});

test("el documento fusionado pide PDF adjunto y OC", () => {
  expect(canDownloadMergedPdf({ oc: 4, tiene_pdf_adjunto: true })).toBe(true);
  expect(canDownloadMergedPdf({ oc: 4, tiene_pdf_adjunto: false })).toBe(false);
  expect(canDownloadMergedPdf({ oc: null, tiene_pdf_adjunto: true })).toBe(false);
});
