import { expect, test } from "@playwright/test";
import type { Cobro, CobroDetalle } from "@/src/features/collections/interfaces/collection.interface";
import { cobroPdfDescriptor } from "@/src/features/collections/utils/cobroPdf";
import { cobroPdfSource } from "@/src/features/collections/utils/cobroPdfSource";
import { cobroRepFileName, hasCobroRepFile } from "@/src/features/collections/utils/cobroRepDownload";
import type { NotaCredito, NotaCreditoDetalle } from "@/src/features/credit-notes/interfaces/credit-note.interface";
import { creditNotePdfDescriptor, hasCreditNoteCfdi } from "@/src/features/credit-notes/utils/creditNotePdf";
import { creditNotePdfSource } from "@/src/features/credit-notes/utils/creditNotePdfSource";
import type { Invoice, InvoiceDetail } from "@/src/features/invoicing/interfaces/invoice.interface";
import { hasInvoiceCfdi, invoicePdfDescriptor } from "@/src/features/invoicing/utils/invoicePdf";
import { invoicePdfSource } from "@/src/features/invoicing/utils/invoicePdfSource";
import type { Pago, PagoDetalle } from "@/src/features/payments/interfaces/payment.interface";
import { pagoPdfDescriptor } from "@/src/features/payments/utils/pagoPdf";
import { pagoPdfSource } from "@/src/features/payments/utils/pagoPdfSource";
import type { Poliza, PolizaDetalle } from "@/src/features/polizas/interfaces/poliza.interface";
import { polizaPdfDescriptor } from "@/src/features/polizas/utils/polizaPdf";
import { polizaPdfSource } from "@/src/features/polizas/utils/polizaPdfSource";
import type {
  FacturaProveedor,
  FacturaProveedorDetalle,
} from "@/src/features/supplier-invoices/interfaces/supplier-invoice.interface";
import { supplierInvoicePdfDescriptor } from "@/src/features/supplier-invoices/utils/supplierInvoicePdf";
import { supplierInvoicePdfSource } from "@/src/features/supplier-invoices/utils/supplierInvoicePdfSource";
import { CobroPdfDocument } from "@/src/pdfs/CobroPdfDocument";
import { CreditNotePdfDocument } from "@/src/pdfs/CreditNotePdfDocument";
import { InvoicePdfDocument } from "@/src/pdfs/InvoicePdfDocument";
import { PagoPdfDocument } from "@/src/pdfs/PagoPdfDocument";
import { PolizaPdfDocument } from "@/src/pdfs/PolizaPdfDocument";
import { SupplierInvoicePdfDocument } from "@/src/pdfs/SupplierInvoicePdfDocument";
import { DocumentPdfLayout, PdfInfoCard, PdfTotals } from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import type { DocumentPdfDescriptor, PdfTotalRow } from "@/src/pdfs/shared/documentPdfModel";
import {
  CfdiFileUnreadableError,
  cfdiFileToBlob,
  officialCfdiErrorMessage,
  officialCfdiFileName,
} from "@/src/utils/officialCfdiFile";
import { elementsOf, pdfCardItems, pdfTable, type TreeElement } from "./support/pdfElementTree";

/**
 * PDF de los documentos de Finanzas (EC-859): factura de cliente, nota de
 * crédito, factura de proveedor, cobro, pago y póliza, más el CFDI oficial
 * (factura, nota y REP). Nombres de archivo, marcas de cancelado, los campos de
 * EC-904 tal cual, columnas condicionales, que nada se recalcula y que cada
 * fuente lee el detalle fresco del servicio. Los fixtures siguen las respuestas
 * de nucleo-erp main con EC-904 (#1204).
 */

const COMPANY = { name: "LAZZAR MEXICO", rfc: "LME070521N11" };

const fileName = (descriptor: DocumentPdfDescriptor) =>
  documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);

/** Texto de una celda: cadena tal cual, o los hijos de `PdfCellText`. */
const cellText = (value: unknown): string => {
  if (typeof value === "string") return value;
  const children = (value as TreeElement | null)?.props?.children;
  return Array.isArray(children) ? children.join("") : String(children ?? "");
};

/** Elementos del documento, sus tarjetas, su tabla y sus totales. */
function read(root: unknown, tableTitle: string) {
  const elements = elementsOf(root);
  const layout = elements.find((element) => element.type === DocumentPdfLayout) as TreeElement;
  const card = (title: string) =>
    Object.fromEntries(pdfCardItems(elements, title).map((item) => [item.label, item.value]));
  const cardTitles = elements.filter((element) => element.type === PdfInfoCard).map((element) => element.props.title);
  const { columns, rows } = pdfTable<unknown>(elements, tableTitle);
  const totals = elements.find((element) => element.type === PdfTotals)?.props.rows as PdfTotalRow[] | undefined;
  return {
    layout: layout.props as {
      title: string;
      subtitle?: string | null;
      statusBanner?: { title: string; detail?: string | null } | null;
      date?: { label: string; value: string };
    },
    card,
    cardTitles,
    headers: columns.map((column) => column.header),
    cells: rows.map((row, index) =>
      Object.fromEntries(columns.map((column) => [column.header, cellText(column.cell(row, index))])),
    ),
    totals: Object.fromEntries((totals ?? []).filter((row) => row.value !== undefined).map((row) => [row.label, row.value])),
  };
}

// ── Factura de cliente ────────────────────────────────────────────────────────

const facturaLinea = (overrides: Partial<InvoiceDetail> = {}): InvoiceDetail => ({
  id: 901,
  factura: 575,
  pedido_detalle: 1200,
  pedido_detalle_talla: 2100,
  producto: 14653,
  cantidad: "2.00",
  precio_unitario: "100.00",
  descuento: "0.00",
  porcentaje_impuesto: "16.00",
  impuesto: "32.00",
  subtotal: "200.00",
  total: "232.00",
  producto_nombre: "PLAYERA POLO",
  talla_nombre: "M",
  ...overrides,
});

const factura = (overrides: Partial<Invoice> = {}): Invoice =>
  ({
    id: 575,
    activo: true,
    factura_detalles: [facturaLinea()],
    moneda_nombre: "MXN",
    cliente_nombre: "EC525 PRUEBA TIMBRADO",
    correo_facturas: "qa@example.invalid",
    empresa: 1,
    sucursal: 1,
    cliente: 43,
    pedido: 594,
    serie_folio: 9,
    moneda: 1,
    fecha_emision: "2026-11-07",
    fecha_vencimiento: "2026-12-07",
    folio: "F-00100",
    subtotal: "200.00",
    descuento: "0.00",
    impuestos: "32.00",
    total: "232.00",
    estatus: "Emitida",
    observaciones: null,
    created_at: "2026-11-07T10:00:00-06:00",
    updated_at: "2026-11-07T10:00:00-06:00",
    cfdi_uuid: null,
    facturama_id: null,
    cfdi_fecha_timbrado: null,
    cfdi_pendiente: false,
    cfdi_cancelado: false,
    cfdi_cancelacion_solicitada: false,
    cfdi_cancelacion_motivo: null,
    cfdi_cancelacion_en_curso_desde: null,
    tipo_cambio: null,
    receptor: {
      cliente: 43,
      nombre: "EC525 PRUEBA TIMBRADO",
      razon_social: "XIAOMI TECHNOLOGY MEXICO",
      rfc: "XIA190128J61",
      regimen_fiscal: { codigo: "601", descripcion: "General de Ley Personas Morales" },
      codigo_postal: "01000",
      correo_facturas: "qa@example.invalid",
    },
    forma_pago: "99",
    forma_pago_nombre: "99 - Por definir",
    metodo_pago: "PPD",
    metodo_pago_nombre: "PPD - Pago en parcialidades o diferido",
    uso_cfdi: "G03",
    uso_cfdi_nombre: "G03 - Gastos en general",
    ...overrides,
  }) as Invoice;

test.describe("PDF de la factura de cliente", () => {
  test("código FAC sin repetir el segmento; solo Cancelada lleva la marca CANCELADA con el motivo SAT", () => {
    expect(fileName(invoicePdfDescriptor(factura()))).toBe("FAC-F-00100.pdf");
    expect(fileName(invoicePdfDescriptor(factura({ folio: "FAC-00068" })))).toBe("FAC-00068.pdf");
    expect(invoicePdfDescriptor(factura()).cancelled).toBe(false);
    expect(invoicePdfDescriptor(factura({ estatus: "Cancelada", cfdi_cancelacion_motivo: "02" }))).toMatchObject({
      cancelled: true,
      cancelledLabel: "CANCELADA",
      cancellationReason: "SAT 02 · Comprobante emitido con errores sin relación",
    });
    // Sin motivo SAT (nunca se timbró): marca sin motivo; el interno va en observaciones.
    expect(invoicePdfDescriptor(factura({ estatus: "Cancelada" })).cancellationReason).toBeUndefined();
  });

  test("receptor fiscal y forma/método/uso de CFDI de EC-904; MXN sin tipo de cambio", () => {
    const doc = read(InvoicePdfDocument({ invoice: factura(), company: COMPANY }), "CONCEPTOS");
    expect(doc.layout.title).toBe("Factura");
    expect(doc.card("RECEPTOR")).toEqual({
      Cliente: "EC525 PRUEBA TIMBRADO",
      "Razón social": "XIAOMI TECHNOLOGY MEXICO",
      RFC: "XIA190128J61",
      "Régimen fiscal": "601 - General de Ley Personas Morales",
      "C.P.": "01000",
      "Uso de CFDI": "G03 - Gastos en general",
    });
    const datos = doc.card("DATOS DE LA FACTURA");
    expect(datos.Moneda).toBe("MXN");
    expect(datos["Tipo de cambio"]).toBeUndefined();
    expect(datos["Forma de pago"]).toBe("99 - Por definir");
    expect(datos["Método de pago"]).toBe("PPD - Pago en parcialidades o diferido");
  });

  test("fuera de MXN imprime el tipo de cambio, o Sin capturar; sin pedido no hay forma ni método", () => {
    const usd = read(
      InvoicePdfDocument({
        invoice: factura({ moneda_nombre: "USD", tipo_cambio: "18.250000", forma_pago: null, metodo_pago: null }),
        company: COMPANY,
      }),
      "CONCEPTOS",
    );
    expect(usd.card("DATOS DE LA FACTURA")).toMatchObject({ Moneda: "USD", "Tipo de cambio": "18.25 MXN por USD" });
    expect(usd.card("DATOS DE LA FACTURA")["Forma de pago"]).toBeUndefined();
    expect(usd.totals.TOTAL).toMatch(/^USD\s232\.00$/);
    const sinCaptura = read(
      InvoicePdfDocument({ invoice: factura({ moneda_nombre: "USD", tipo_cambio: null }), company: COMPANY }),
      "CONCEPTOS",
    );
    expect(sinCaptura.card("DATOS DE LA FACTURA")["Tipo de cambio"]).toBe("Sin capturar");
  });

  test("conceptos con talla e IVA solo si algún renglón los trae; importes guardados tal cual", () => {
    const doc = read(InvoicePdfDocument({ invoice: factura(), company: COMPANY }), "CONCEPTOS");
    expect(doc.headers).toEqual(["Descripción", "Talla", "Cantidad", "Precio u.", "IVA", "Descuento", "Importe"]);
    expect(doc.cells[0]).toMatchObject({ Descripción: "PLAYERA POLO", Talla: "M", IVA: "16%", Importe: "$232.00" });
    expect(doc.totals).toEqual({ Subtotal: "$200.00", Impuestos: "$32.00", TOTAL: "$232.00" });

    const sinTalla = read(
      InvoicePdfDocument({
        invoice: factura({ factura_detalles: [facturaLinea({ talla_nombre: null, porcentaje_impuesto: null })] }),
        company: COMPANY,
      }),
      "CONCEPTOS",
    );
    expect(sinTalla.headers).toEqual(["Descripción", "Cantidad", "Precio u.", "Descuento", "Importe"]);
  });

  test("Borrador sin estatus; timbrada con su CFDI y el aviso de no fiscal; eliminada con su banner", () => {
    const borrador = read(InvoicePdfDocument({ invoice: factura({ estatus: "Borrador" }), company: COMPANY }), "CONCEPTOS");
    expect(borrador.card("DATOS DE LA FACTURA").Estatus).toBeUndefined();
    expect(borrador.cardTitles).not.toContain("COMPROBANTE FISCAL (CFDI)");
    expect(borrador.layout.statusBanner).toBeNull();

    const timbrada = read(
      InvoicePdfDocument({
        invoice: factura({
          cfdi_uuid: "A06E9145-0000-4000-8000-000000000001",
          facturama_id: "fm-1",
          cfdi_fecha_timbrado: "2026-11-07T12:00:00-06:00",
          cfdi_cancelacion_solicitada: true,
        }),
        company: COMPANY,
      }),
      "CONCEPTOS",
    );
    expect(timbrada.card("COMPROBANTE FISCAL (CFDI)")).toMatchObject({
      "Folio fiscal": "A06E9145-0000-4000-8000-000000000001",
      "Estado del CFDI": "Cancelación solicitada ante el SAT",
    });
    expect(timbrada.layout.statusBanner?.title).toBe("REPRESENTACIÓN NO FISCAL");

    const eliminada = read(InvoicePdfDocument({ invoice: factura({ activo: false }), company: COMPANY }), "CONCEPTOS");
    expect(eliminada.layout.statusBanner?.title).toBe("FACTURA ELIMINADA");
  });

  test("Descargar CFDI solo con UUID y id de Facturama; su archivo lleva -CFDI", () => {
    expect(hasInvoiceCfdi(factura())).toBe(false);
    expect(hasInvoiceCfdi(factura({ cfdi_uuid: "X", facturama_id: null }))).toBe(false);
    expect(hasInvoiceCfdi(factura({ cfdi_uuid: "X", facturama_id: "fm-1" }))).toBe(true);
    expect(officialCfdiFileName(fileName(invoicePdfDescriptor(factura())), "pdf")).toBe("FAC-F-00100-CFDI.pdf");
    expect(officialCfdiFileName(fileName(invoicePdfDescriptor(factura())), "xml")).toBe("FAC-F-00100-CFDI.xml");
    expect(officialCfdiFileName(fileName(creditNotePdfDescriptor(nota({ folio: null }))), "xml")).toBe("NC-ID29-CFDI.xml");
  });
});

// ── Nota de crédito ───────────────────────────────────────────────────────────

const notaLinea = (overrides: Partial<NotaCreditoDetalle> = {}): NotaCreditoDetalle => ({
  id: 41,
  nota_credito: 29,
  factura_detalle: 901,
  cantidad: "1.00",
  precio_unitario: "100.00",
  impuesto: "16.00",
  subtotal: "100.00",
  total: "116.00",
  producto_nombre: "PLAYERA POLO",
  talla_nombre: "M",
  ...overrides,
});

const nota = (overrides: Partial<NotaCredito> = {}): NotaCredito => ({
  id: 29,
  factura: 102,
  cliente: 43,
  cliente_nombre: "EC525 PRUEBA TIMBRADO",
  factura_folio: "F-00094",
  fecha_emision: "2026-10-29",
  folio: "NC-EC639-A",
  motivo: "Devolución parcial",
  subtotal: "100.00",
  impuestos: "16.00",
  total: "116.00",
  estatus: "Emitida",
  observaciones: null,
  created_at: null,
  updated_at: null,
  cfdi_uuid: null,
  facturama_id: null,
  cfdi_fecha_timbrado: null,
  cfdi_pendiente: false,
  nota_credito_detalles: [notaLinea()],
  moneda: 1,
  moneda_nombre: "MXN",
  tipo_cambio: "1.000000",
  factura_uuid: "B946CD7F-0000-4000-8000-000000000002",
  ...overrides,
});

test.describe("PDF de la nota de crédito", () => {
  test("código NC; folio libre, sin folio NC-ID; solo Cancelada lleva CANCELADA", () => {
    expect(fileName(creditNotePdfDescriptor(nota()))).toBe("NC-EC639-A.pdf");
    expect(fileName(creditNotePdfDescriptor(nota({ folio: "A 12" })))).toBe("NC-A-12.pdf");
    expect(fileName(creditNotePdfDescriptor(nota({ folio: null })))).toBe("NC-ID29.pdf");
    expect(creditNotePdfDescriptor(nota({ estatus: "Cancelada" }))).toMatchObject({
      cancelled: true,
      cancelledLabel: "CANCELADA",
    });
    expect(creditNotePdfDescriptor(nota({ estatus: "Borrador" })).cancelled).toBe(false);
  });

  test("moneda, tipo de cambio y factura relacionada de EC-904; el motivo no es de cancelación", () => {
    const doc = read(CreditNotePdfDocument({ nota: nota(), company: COMPANY }), "CONCEPTOS ACREDITADOS");
    expect(doc.card("DATOS DE LA NOTA")).toEqual({
      Cliente: "EC525 PRUEBA TIMBRADO",
      Estatus: "Emitida",
      Motivo: "Devolución parcial",
      Moneda: "MXN",
    });
    expect(doc.card("FACTURA RELACIONADA")).toEqual({
      Folio: "F-00094",
      "Folio fiscal": "B946CD7F-0000-4000-8000-000000000002",
    });
    const usd = read(
      CreditNotePdfDocument({ nota: nota({ moneda_nombre: "USD", tipo_cambio: null }), company: COMPANY }),
      "CONCEPTOS ACREDITADOS",
    );
    expect(usd.card("DATOS DE LA NOTA")["Tipo de cambio"]).toBe("Sin capturar");
  });

  test("la talla solo aparece si algún renglón la trae: un servicio extra no tiene", () => {
    const conTalla = read(CreditNotePdfDocument({ nota: nota(), company: COMPANY }), "CONCEPTOS ACREDITADOS");
    expect(conTalla.headers).toEqual(["Concepto", "Talla", "Cantidad", "Precio u.", "Impuesto", "Importe"]);
    const servicio = read(
      CreditNotePdfDocument({
        nota: nota({ nota_credito_detalles: [notaLinea({ producto_nombre: "BORDADO EXTRA", talla_nombre: null })] }),
        company: COMPANY,
      }),
      "CONCEPTOS ACREDITADOS",
    );
    expect(servicio.headers).toEqual(["Concepto", "Cantidad", "Precio u.", "Impuesto", "Importe"]);
    expect(servicio.cells[0]).toMatchObject({ Concepto: "BORDADO EXTRA", Importe: "$116.00" });
    expect(servicio.totals).toEqual({ Subtotal: "$100.00", Impuestos: "$16.00", TOTAL: "$116.00" });
  });

  test("timbrada: tarjeta del CFDI de egreso, aviso de no fiscal y Descargar CFDI", () => {
    const timbrada = nota({ cfdi_uuid: "C0FFEE00-0000-4000-8000-000000000003", facturama_id: "fm-nc" });
    const doc = read(CreditNotePdfDocument({ nota: timbrada, company: COMPANY }), "CONCEPTOS ACREDITADOS");
    expect(doc.cardTitles).toContain("COMPROBANTE FISCAL (CFDI DE EGRESO)");
    expect(doc.layout.statusBanner?.title).toBe("REPRESENTACIÓN NO FISCAL");
    expect(hasCreditNoteCfdi(timbrada)).toBe(true);
    expect(hasCreditNoteCfdi(nota())).toBe(false);
  });
});

// ── Factura de proveedor ──────────────────────────────────────────────────────

const fpLinea = (overrides: Partial<FacturaProveedorDetalle> = {}): FacturaProveedorDetalle => ({
  id: 77,
  factura_proveedor: 31,
  oc_detalle: 500,
  recepcion_detalle: 800,
  producto: 210,
  cantidad: "10.00",
  precio_unitario: "50.00",
  descuento: "0.00",
  impuesto: "80.00",
  subtotal: "500.00",
  total: "580.00",
  producto_nombre: "TELA PIQUE",
  producto_codigo: "TP-001",
  ...overrides,
});

const facturaProveedor = (overrides: Partial<FacturaProveedor> = {}): FacturaProveedor => ({
  id: 31,
  empresa: 1,
  sucursal: 1,
  proveedor: 9,
  oc: 120,
  recepcion: 140,
  moneda: 2,
  proveedor_nombre: "TEXTILES DEL BAJIO",
  moneda_codigo: "USD",
  oc_folio: "OC-00010-2026",
  recepcion_folio: "RC-00011",
  fecha_emision: "2026-11-10",
  fecha_vencimiento: null,
  folio: "A-123",
  subtotal: "500.00",
  descuento: "0.00",
  impuestos: "80.00",
  total: "580.00",
  estatus: "Registrada",
  observaciones: null,
  activo: true,
  created_at: null,
  updated_at: null,
  tiene_pdf_adjunto: false,
  pdf_adjunto_nombre: null,
  factura_proveedor_detalles: [fpLinea()],
  ...overrides,
});

test.describe("PDF de la factura de proveedor", () => {
  test("código FP con el folio del proveedor; Cancelada lleva CANCELADA", () => {
    expect(fileName(supplierInvoicePdfDescriptor(facturaProveedor()))).toBe("FP-A-123.pdf");
    expect(fileName(supplierInvoicePdfDescriptor(facturaProveedor({ folio: null })))).toBe("FP-ID31.pdf");
    expect(supplierInvoicePdfDescriptor(facturaProveedor({ estatus: "Cancelada" }))).toMatchObject({
      cancelled: true,
      cancelledLabel: "CANCELADA",
    });
  });

  test("se genera con o sin adjunto; el código del producto solo si algún renglón lo trae", () => {
    const doc = read(SupplierInvoicePdfDocument({ factura: facturaProveedor(), company: COMPANY }), "RENGLONES");
    expect(doc.card("ORIGEN")).toEqual({ "Orden de compra": "OC-00010-2026", Recepción: "RC-00011" });
    expect(doc.headers).toEqual(["Código", "Producto", "Cantidad", "Precio u.", "Descuento", "Impuesto", "Importe"]);
    expect(doc.cells[0]).toMatchObject({ Código: "TP-001", Producto: "TELA PIQUE" });
    // Con la moneda de la factura, nunca pesos por defecto.
    expect(doc.totals.TOTAL).toMatch(/^USD\s580\.00$/);

    const sinCodigo = read(
      SupplierInvoicePdfDocument({
        factura: facturaProveedor({ factura_proveedor_detalles: [fpLinea({ producto_codigo: null })] }),
        company: COMPANY,
      }),
      "RENGLONES",
    );
    expect(sinCodigo.headers[0]).toBe("Producto");
  });
});

// ── Cobro ─────────────────────────────────────────────────────────────────────

const cobroLinea = (overrides: Partial<CobroDetalle> = {}): CobroDetalle => ({
  id: 60,
  cobro: 18,
  cxc: 28,
  importe_aplicado: "50.00",
  observaciones: null,
  created_at: "2026-10-22T12:00:00-06:00",
  factura_id: 75,
  factura_folio: "F-00072",
  ...overrides,
});

const cobro = (overrides: Partial<Cobro> = {}): Cobro => ({
  id: 18,
  empresa: 1,
  cliente: 43,
  cliente_nombre: "EC525 PRUEBA TIMBRADO",
  cuenta_bancaria: 3,
  cuenta_bancaria_alias: "BANORTE MXN",
  cuenta_bancaria_moneda_codigo: "MXN",
  cuenta_bancaria_activo: true,
  sucursal: 1,
  sucursal_nombre: "MATRIZ",
  sucursal_codigo: "MTZ",
  fecha_cobro: "2026-10-22",
  metodo_pago: "Transferencia",
  referencia: "SPEI",
  referencia_operacion: "123456",
  total_cobrado: "50.00",
  moneda: 1,
  tipo_cambio: "1.000000",
  folio: "COB-00001",
  estatus: "Aplicado",
  observaciones: null,
  activo: true,
  rep_uuid: "BC05D346-0000-4000-8000-000000000004",
  rep_facturama_id: "fm-rep",
  rep_fecha_timbrado: "2026-10-22T12:05:00-06:00",
  rep_pendiente: false,
  rep_cancelacion_solicitada: false,
  rep_cancelacion_motivo: null,
  rep_cancelacion_en_curso_desde: null,
  rep_cancelado_uuid: null,
  rep_fecha_cancelacion: null,
  created_at: "2026-10-22T12:00:00-06:00",
  updated_at: "2026-10-22T12:05:00-06:00",
  cobro_detalles: [cobroLinea()],
  ...overrides,
});

test.describe("PDF del cobro y archivo del REP", () => {
  test("código COB sin repetir el segmento; borrador sin folio COB-ID; Cancelado con la marca de siempre", () => {
    expect(fileName(cobroPdfDescriptor(cobro()))).toBe("COB-00001.pdf");
    expect(fileName(cobroPdfDescriptor(cobro({ folio: null, estatus: "Borrador" })))).toBe("COB-ID18.pdf");
    const cancelado = cobroPdfDescriptor(cobro({ estatus: "Cancelado" }));
    expect(cancelado.cancelled).toBe(true);
    expect(cancelado.cancelledLabel).toBeUndefined();
  });

  test("facturas con su folio (EC-904) e importe aplicado, sin saldo; el REP timbrado en su tarjeta", () => {
    const doc = read(CobroPdfDocument({ cobro: cobro(), company: COMPANY }), "FACTURAS COBRADAS");
    expect(doc.headers).toEqual(["Factura", "Importe aplicado"]);
    expect(doc.cells[0]).toEqual({ Factura: "F-00072", "Importe aplicado": "$50.00" });
    expect(doc.card("COMPLEMENTO DE PAGO (REP)")["Folio fiscal"]).toBe("BC05D346-0000-4000-8000-000000000004");
    expect(doc.card("CUENTA")).toMatchObject({ "Cuenta bancaria": "BANORTE MXN", Moneda: "MXN" });
    expect(doc.card("DATOS DEL COBRO").Referencia).toBe("SPEI");
    expect(doc.totals).toEqual({ "TOTAL COBRADO": "$50.00" });
  });

  test("el estado del REP sigue sus banderas, con las etiquetas del CFDI de la factura", () => {
    const tarjeta = (overrides: Partial<Cobro>) => {
      const doc = read(CobroPdfDocument({ cobro: cobro(overrides), company: COMPANY }), "FACTURAS COBRADAS");
      return doc.cardTitles.includes("COMPLEMENTO DE PAGO (REP)") ? doc.card("COMPLEMENTO DE PAGO (REP)") : null;
    };
    expect(tarjeta({})?.["Estado del REP"]).toBe("Vigente");
    expect(tarjeta({ rep_cancelacion_solicitada: true })?.["Estado del REP"]).toBe("Cancelación solicitada ante el SAT");
    expect(
      tarjeta({ rep_uuid: null, rep_facturama_id: null, rep_cancelado_uuid: "OLD-UUID", rep_fecha_cancelacion: "2026-11-01T10:00:00-06:00" }),
    ).toMatchObject({ "Folio fiscal (cancelado)": "OLD-UUID", "Estado del REP": "Cancelado ante el SAT" });
    expect(tarjeta({ rep_uuid: null, rep_facturama_id: "fm-rep", rep_pendiente: true })).toEqual({
      "Estado del REP": "Timbrado pendiente de confirmar",
    });
    expect(tarjeta({ rep_uuid: null, rep_facturama_id: null })).toBeNull();
  });

  test("la sucursal sale de sucursal_nombre; un Borrador sin líneas (null) imprime «—» (EC-866)", () => {
    const datos = (overrides: Partial<Cobro>) =>
      read(CobroPdfDocument({ cobro: cobro(overrides), company: COMPANY }), "FACTURAS COBRADAS").card("DATOS DEL COBRO");
    expect(datos({}).Sucursal).toBe("MATRIZ");
    expect(
      datos({ estatus: "Borrador", folio: null, sucursal: null, sucursal_nombre: null, sucursal_codigo: null, cobro_detalles: [] })
        .Sucursal,
    ).toBe("—");
  });

  test("el REP se descarga como REP-<folio del cobro>, sin permiso aparte", () => {
    expect(cobroRepFileName(cobro(), "pdf")).toBe("REP-COB-00001.pdf");
    expect(cobroRepFileName(cobro({ folio: "COB 00002/26" }), "xml")).toBe("REP-COB-00002-26.xml");
    expect(cobroRepFileName(cobro({ folio: null }), "pdf")).toBe("REP-ID18.pdf");
    expect(hasCobroRepFile(cobro())).toBe(true);
    expect(hasCobroRepFile(cobro({ rep_uuid: null, rep_facturama_id: null }))).toBe(false);
  });
});

// ── Pago a proveedor ──────────────────────────────────────────────────────────

const pagoLinea = (overrides: Partial<PagoDetalle> = {}): PagoDetalle => ({
  id: 15,
  pago: 12,
  cxp: 40,
  importe_aplicado: "580.00",
  observaciones: null,
  created_at: null,
  factura_proveedor_folio: "A-123",
  ...overrides,
});

const pago = (overrides: Partial<Pago> = {}): Pago => ({
  id: 12,
  empresa: 1,
  proveedor: 9,
  cuenta_bancaria: 4,
  proveedor_nombre: "TEXTILES DEL BAJIO",
  cuenta_bancaria_alias: "BBVA USD",
  sucursal: 1,
  sucursal_nombre: "MATRIZ",
  sucursal_codigo: "MTZ",
  fecha_pago: "2026-11-12",
  metodo_pago: "Transferencia",
  referencia: null,
  referencia_operacion: null,
  total_pagado: "580.00",
  estatus: "Aplicado",
  observaciones: null,
  activo: true,
  created_at: null,
  updated_at: null,
  pago_detalles: [pagoLinea()],
  moneda: 2,
  moneda_nombre: "USD",
  ...overrides,
});

test.describe("PDF del pago a proveedor", () => {
  test("sin folio en el backend: siempre PAG-ID<id>; Cancelado con la marca de siempre", () => {
    expect(fileName(pagoPdfDescriptor(pago()))).toBe("PAG-ID12.pdf");
    expect(pagoPdfDescriptor(pago({ estatus: "Cancelado" })).cancelled).toBe(true);
  });

  test("moneda de la cuenta (EC-904) y ningún tipo de cambio", () => {
    const doc = read(PagoPdfDocument({ pago: pago(), company: COMPANY }), "FACTURAS PAGADAS");
    expect(doc.card("CUENTA")).toEqual({ "Cuenta bancaria": "BBVA USD", Moneda: "USD" });
    expect(doc.cells[0]).toMatchObject({ "Factura de proveedor": "A-123" });
    expect(doc.cells[0]["Importe aplicado"]).toMatch(/^USD\s580\.00$/);
    expect(JSON.stringify(doc.card("DATOS DEL PAGO"))).not.toContain("Tipo de cambio");
  });

  test("la sucursal sale de sucursal_nombre; sin sucursal (null) imprime «—» (EC-866)", () => {
    const datos = (overrides: Partial<Pago>) =>
      read(PagoPdfDocument({ pago: pago(overrides), company: COMPANY }), "FACTURAS PAGADAS").card("DATOS DEL PAGO");
    expect(datos({}).Sucursal).toBe("MATRIZ");
    expect(datos({ sucursal: null, sucursal_nombre: null, sucursal_codigo: null }).Sucursal).toBe("—");
  });
});

// ── Póliza ────────────────────────────────────────────────────────────────────

const polizaLinea = (overrides: Partial<PolizaDetalle> = {}): PolizaDetalle => ({
  id: 1,
  poliza: 899,
  cuenta_contable: 10,
  centro_costo: null,
  cargo: "100.00",
  abono: "0.00",
  referencia: null,
  observaciones: null,
  orden: 1,
  factura: null,
  factura_proveedor: null,
  pago: null,
  cobro: null,
  movimiento_bancario: null,
  cuenta_contable_codigo: "1105",
  cuenta_contable_nombre: "Clientes",
  ...overrides,
});

const poliza = (overrides: Partial<Poliza> = {}): Poliza => ({
  id: 899,
  empresa: 1,
  sucursal: 1,
  centro_costo: null,
  folio: "POL-000001",
  folio_consecutivo: 1,
  tipo: "Diario",
  fecha: "2026-11-17",
  concepto: "QA-CONT-01",
  estatus: "Contabilizada",
  usuario_creacion: 1,
  activo: true,
  total_cargos: "100.00",
  total_abonos: "100.00",
  cuadre_correcto: true,
  poliza_detalles: [
    polizaLinea({ id: 2, orden: 2, cargo: "0.00", abono: "100.00", cuenta_contable_codigo: "4100", cuenta_contable_nombre: "Ventas" }),
    polizaLinea(),
  ],
  ...overrides,
});

test.describe("PDF de la póliza", () => {
  test("código POL; una manual sin folio es POL-ID; Cancelada lleva CANCELADA", () => {
    expect(fileName(polizaPdfDescriptor(poliza()))).toBe("POL-000001.pdf");
    expect(fileName(polizaPdfDescriptor(poliza({ folio: null })))).toBe("POL-ID899.pdf");
    expect(polizaPdfDescriptor(poliza({ estatus: "Cancelada" }))).toMatchObject({ cancelled: true, cancelledLabel: "CANCELADA" });
  });

  test("movimientos en el orden del asiento con código y nombre de la cuenta; totales del backend", () => {
    const doc = read(PolizaPdfDocument({ poliza: poliza(), company: COMPANY }), "MOVIMIENTOS");
    expect(doc.layout.title).toBe("Póliza de diario");
    expect(doc.headers).toEqual(["Cuenta", "Nombre de la cuenta", "Cargo", "Abono"]);
    expect(doc.cells.map((row) => row.Cuenta)).toEqual(["1105", "4100"]);
    expect(doc.cells[0]).toMatchObject({ "Nombre de la cuenta": "Clientes", Cargo: "100.00", Abono: "0.00" });
    expect(doc.totals).toEqual({ "Total cargos": "100.00", "Total abonos": "100.00" });
    expect(doc.layout.statusBanner).toBeNull();
  });

  test("una línea sin cuenta dice Sin cuenta; la referencia aparece si alguna la trae; descuadre con banner", () => {
    const doc = read(
      PolizaPdfDocument({
        poliza: poliza({
          cuadre_correcto: false,
          poliza_detalles: [
            polizaLinea({ cuenta_contable: null, cuenta_contable_codigo: null, cuenta_contable_nombre: null, referencia: "REF-1" }),
          ],
        }),
        company: COMPANY,
      }),
      "MOVIMIENTOS",
    );
    expect(doc.headers).toContain("Referencia");
    expect(doc.cells[0]).toMatchObject({ Cuenta: "—", "Nombre de la cuenta": "Sin cuenta", Referencia: "REF-1" });
    expect(doc.layout.statusBanner?.title).toBe("PÓLIZA DESCUADRADA");
  });
});

// ── CFDI oficial ──────────────────────────────────────────────────────────────

test.describe("CFDI oficial de Facturama", () => {
  test("decodifica el base64 de Content con el MIME del formato; vacío o ilegible es un error propio", async () => {
    const pdf = cfdiFileToBlob({ Content: Buffer.from("%PDF-1.4 fake").toString("base64"), ContentType: "pdf" }, "pdf");
    expect(pdf.type).toBe("application/pdf");
    expect(await pdf.text()).toBe("%PDF-1.4 fake");
    expect(cfdiFileToBlob({ Content: Buffer.from("<x/>").toString("base64") }, "xml").type).toBe("application/xml");
    expect(() => cfdiFileToBlob({ Content: "" }, "pdf")).toThrow(CfdiFileUnreadableError);
    expect(() => cfdiFileToBlob({}, "pdf")).toThrow(CfdiFileUnreadableError);
    expect(() => cfdiFileToBlob({ Content: "%%%no-base64" }, "pdf")).toThrow(CfdiFileUnreadableError);
  });

  test("el 400 de facturas/{id}/cfdi/ se lee del campo cfdi", () => {
    const error = Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      response: { status: 400, data: { cfdi: "La factura no tiene CFDI timbrado." } },
    });
    expect(officialCfdiErrorMessage(error, "de la factura")).toBe("La factura no tiene CFDI timbrado.");
  });

  test("un 502 muestra el motivo del backend si lo trae; si no, o si es el del passthrough, el genérico", () => {
    const http = (status: number, data: unknown) =>
      Object.assign(new Error("Request failed"), { isAxiosError: true, response: { status, data } });
    const generico = "Facturama no entregó el archivo. Intenta de nuevo más tarde.";
    expect(
      officialCfdiErrorMessage(http(502, { cfdi: "Facturama no entregó el archivo: CFDI no encontrado" }), "de la factura"),
    ).toBe("Facturama no entregó el archivo: CFDI no encontrado");
    expect(officialCfdiErrorMessage(http(502, { error: "FACTURAMA_TIMEOUT", message: "timeout" }), "del REP")).toBe(generico);
    expect(officialCfdiErrorMessage(http(504, "<html>Gateway Timeout</html>"), "de la factura")).toBe(generico);
  });
});

// ── Fuentes: el detalle fresco del servicio ───────────────────────────────────

/** Corre una fuente con `v1_api.get` sustituido y devuelve las URL pedidas y el descriptor. */
async function download<Detail>(
  detail: Detail,
  run: (render: (detail: Detail) => Promise<Blob>) => (context: { company: typeof COMPANY }) => Promise<{
    descriptor: DocumentPdfDescriptor;
  }>,
) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const urls: string[] = [];
  v1_api.get = (async (url: string) => {
    urls.push(url);
    return { data: detail };
  }) as typeof v1_api.get;
  try {
    const file = await run(async () => new Blob(["%PDF-fake"], { type: "application/pdf" }))({ company: COMPANY });
    return { urls, descriptor: file.descriptor };
  } finally {
    v1_api.get = originalGet;
  }
}

test.describe("fuentes de los PDF de Finanzas", () => {
  test("cada una lee su retrieve con el servicio y nombra el archivo con lo que leyó", async () => {
    const fac = await download(factura({ estatus: "Cancelada" }), (render) => invoicePdfSource({ invoiceId: 575, render }));
    expect(fac.urls).toEqual(["/finanzas/facturas/575/"]);
    expect(fac.descriptor).toMatchObject({ folio: "F-00100", cancelled: true });

    const nc = await download(nota(), (render) => creditNotePdfSource({ notaId: 29, render }));
    expect(nc.urls).toEqual(["/finanzas/notas-credito/29/"]);

    const fp = await download(facturaProveedor(), (render) => supplierInvoicePdfSource({ facturaId: 31, render }));
    expect(fp.urls).toEqual(["/finanzas/facturas-proveedor/31/"]);

    const cob = await download(cobro(), (render) => cobroPdfSource({ cobroId: 18, render }));
    expect(cob.urls).toEqual(["/finanzas/cobros/18/"]);
    expect(fileName(cob.descriptor)).toBe("COB-00001.pdf");

    const pag = await download(pago(), (render) => pagoPdfSource({ pagoId: 12, render }));
    expect(pag.urls).toEqual(["/finanzas/pagos/12/"]);

    const pol = await download(poliza({ folio: null }), (render) => polizaPdfSource({ polizaId: 899, render }));
    expect(pol.urls).toEqual(["/finanzas/polizas/899/"]);
    expect(fileName(pol.descriptor)).toBe("POL-ID899.pdf");
  });
});
