import { expect, test } from "@playwright/test";
import { purchaseOrderPdfDescriptor } from "@/src/features/purchase-orders/utils/purchaseOrderPdfDescriptor";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";

/**
 * Fuente del PDF de un documento y descriptor de la OC (EC-855): el PDF y su
 * nombre salen del detalle FRESCO (no de la fila cacheada), y solo la OC
 * cancelada (estatus 6) lleva la marca con su motivo. Corren con
 * `npm run test:unit`; el render del PDF se sustituye por uno falso.
 */

type OcRow = Pick<PurchaseOrder, "id" | "folio" | "estatus" | "motivo_cancelacion">;

const company = { name: "LAZZAR MEXICO", rfc: "LME070521N11" };

const fileNameOf = (descriptor: DocumentPdfDescriptor) =>
  documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);

test.describe("renderedDocumentPdfSource", () => {
  test("el PDF y su nombre salen del detalle fresco, no de la fila cacheada", async () => {
    // La pantalla tenía la orden sin folio y autorizada; al volver a pedirla ya
    // tiene folio y está cancelada.
    const cached: OcRow = { id: 7, folio: null, estatus: 3, motivo_cancelacion: null };
    const fresh: OcRow = { id: 7, folio: "OC-00012-2026", estatus: 6, motivo_cancelacion: "Duplicada" };
    const rendered: Array<{ detail: OcRow; descriptor: DocumentPdfDescriptor }> = [];
    const blob = new Blob(["%PDF-fake"], { type: "application/pdf" });

    const source = renderedDocumentPdfSource<OcRow>({
      fetchDetail: async () => fresh,
      describe: purchaseOrderPdfDescriptor,
      render: async (detail, context) => {
        expect(context.company).toEqual(company);
        rendered.push({ detail, descriptor: context.descriptor });
        return blob;
      },
    });

    const file = await source({ company });

    expect(file.blob).toBe(blob);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].detail).toBe(fresh);
    expect(file.descriptor).toEqual(rendered[0].descriptor);
    expect(fileNameOf(file.descriptor)).toBe("OC-00012-2026.pdf");
    expect(fileNameOf(purchaseOrderPdfDescriptor(cached))).toBe("OC-ID7.pdf");
    expect(file.descriptor.cancelled).toBe(true);
  });

  test("un error al pedir el detalle no genera el PDF", async () => {
    let renders = 0;
    const source = renderedDocumentPdfSource<OcRow>({
      fetchDetail: async () => {
        throw new Error("404");
      },
      describe: purchaseOrderPdfDescriptor,
      render: async () => {
        renders++;
        return new Blob([]);
      },
    });
    await expect(source({ company })).rejects.toThrow("404");
    expect(renders).toBe(0);
  });
});

test.describe("purchaseOrderPdfDescriptor", () => {
  test("estatus 6 se marca como cancelado, con su motivo", () => {
    expect(
      purchaseOrderPdfDescriptor({ id: 9, folio: "OC-9", estatus: 6, motivo_cancelacion: "Proveedor duplicado" }),
    ).toEqual({
      type: "OC",
      id: 9,
      folio: "OC-9",
      cancelled: true,
      cancellationReason: "Proveedor duplicado",
    });
  });

  test("los demás estatus no se marcan como cancelados", () => {
    for (const estatus of [1, 2, 3, 4, 5]) {
      expect(
        purchaseOrderPdfDescriptor({ id: 9, folio: "OC-9", estatus, motivo_cancelacion: null }).cancelled,
      ).toBe(false);
    }
  });

  test("una OC sin folio se llama OC-ID<id>.pdf", () => {
    expect(fileNameOf(purchaseOrderPdfDescriptor({ id: 1314, folio: null, estatus: 2, motivo_cancelacion: null }))).toBe(
      "OC-ID1314.pdf",
    );
    expect(fileNameOf(purchaseOrderPdfDescriptor({ id: 1314, folio: "", estatus: 1, motivo_cancelacion: null }))).toBe(
      "OC-ID1314.pdf",
    );
  });
});
