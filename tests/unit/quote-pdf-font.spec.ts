import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { buildQuotePdfModel } from "@/src/features/quotes/utils/quotePdfTemplateHelpers";
import { QuotePdfDocument } from "@/src/pdfs/QuotePdfDocument";
import { pdfPageTexts } from "./support/pdfLayout";
import { toReactElement } from "./support/pwJsx";

/**
 * Fuente del PDF de cotización (EC-892): con la Helvetica estándar (solo
 * WinAnsi) cualquier otro carácter del backend desaparecía sin aviso. La
 * cotización usa ahora la Arimo de la base (`documentPdfFonts`, EC-858): los
 * anchos no cambian, pero el alto de línea es ~2.5 % mayor. Maqueta una
 * cotización real con react-pdf y lee su texto.
 */

const NOTAS = "Entrega → almacén ≥ 2 piezas • “urgente” – Œuvre ½";

const QUOTE_PDF_FIXTURE = {
  id: 892,
  cliente: 5,
  cliente_razon_social: "EMPRESA Ñandú → Norte",
  cliente_nombre: "Ana Pérez",
  correo_facturas: "facturas@example.com",
  persona_pagos: "Luis",
  estatus_label: "Borrador",
  created_at: "2026-11-20T10:00:00Z",
  oc: "OC-1 ≥ 2",
  forma_pago: "PUE",
  uso_cfdi: "G03",
  destinatario: "Almacén central",
  direccion_envio: "Av. Siempre Viva 742",
  colonia_envio: "Centro",
  codigo_postal: "44100",
  ciudad_envio: "Guadalajara",
  estado_envio: "Jalisco",
  observaciones: NOTAS,
  iva: "160.00",
  gran_total: "1160.00",
  anticipo: "0.00",
  detalles: [
    {
      id: 1,
      producto: 10,
      producto_nombre: "Camisa → manga larga ≥ talla M",
      precio_unitario: "100.00",
      tallas: [
        {
          talla_nombre: "M",
          cantidad: 5,
          sku: "CAM-AZ-M",
          lleva_bordado: true,
          bordado_config: {
            notas: "Hilo • dorado → frente",
            ubicaciones: [{ codigo: "PD", ancho_cm: 8, alto_cm: 6, color_hilo: "Dorado ≥ 2", imagen: null }],
          },
          lleva_reflejante: true,
          reflejante_config: [{ tipo: "GRIS", posicion: "PECHO", opcion: "COSIDO" }],
          lleva_corte_manga: true,
        },
        { talla_nombre: "G", cantidad: 5, sku: "CAM-AZ-G" },
      ],
    },
  ],
} as unknown as QuoteById;

const quotePdfElement = (quote: QuoteById = QUOTE_PDF_FIXTURE) =>
  createElement(QuotePdfDocument, { quote, model: buildQuotePdfModel(quote, "MXN") });

test.describe("fuente del PDF de cotización", () => {
  test("incrusta Arimo e imprime los caracteres fuera de WinAnsi", async () => {
    test.setTimeout(60_000);
    const pdf = await renderToBuffer(toReactElement(quotePdfElement()) as Parameters<typeof renderToBuffer>[0]);
    const raw = pdf.toString("latin1");
    // Cada variante por separado (pdfkit las nombra "<prefijo>+Arimo-Regular" y
    // "<prefijo>+Arimo-Bold"): un solo `Arimo\b` aceptaría cualquiera de las dos.
    const variantes = [...raw.matchAll(/\/BaseFont\s*\/[A-Z]{6}\+([\w-]+)/g)].map(([, nombre]) => nombre);
    expect(variantes.filter((nombre) => nombre === "Arimo-Regular").length).toBeGreaterThan(0);
    expect(variantes.filter((nombre) => nombre === "Arimo-Bold").length).toBeGreaterThan(0);
    expect(raw).not.toContain("/BaseFont /Helvetica");
    const texto = pdfPageTexts(pdf).join("\n");
    for (const fragmento of [
      "Entrega → almacén ≥ 2 piezas • “urgente” – Œuvre ½",
      "Camisa → manga larga ≥ talla M",
      "EMPRESA Ñandú → Norte",
      "Hilo • dorado → frente",
      "OC-1 ≥ 2",
    ]) {
      expect(texto).toContain(fragmento);
    }
  });
});
