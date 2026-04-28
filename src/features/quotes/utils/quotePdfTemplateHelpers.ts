/**
 * Builder del modelo que consume QuotePdfDocument.
 * Centraliza calculos y transformaciones para que el componente sea puramente presentacional.
 */
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { QuoteById } from "../interfaces/quote.interface";
import {
  buildQuoteEmailDetailRows,
  getQuoteComputedSubtotal,
  getQuoteDetailSizesSummary,
  getQuoteTotalPieces,
  getQuoteShippingAddress,
} from "./quoteEmailTemplateHelpers";
import type { QuoteEmailDetailRow } from "./quoteEmailTemplateHelpers";
import { formatQuoteDateTime } from "./quoteDetailsFormatters";

// ---------------------------------------------------------------------------
// Tipos de addons por detalle (bordados, reflejantes, corte de manga)
// ---------------------------------------------------------------------------

export type PdfEmbroideryLocation = {
  codigo: string;
  ancho_cm: number;
  alto_cm: number;
  color_hilo: string | null;
  imagen: string;
};

export type PdfEmbroideryGroup = {
  /** Etiqueta descriptiva, ej. "Bordado 1". */
  label: string;
  notes: string;
  /** Nombres de las tallas que comparten esta configuración. */
  sizeNames: string[];
  locations: PdfEmbroideryLocation[];
};

export type PdfReflectiveSpec = {
  opcion: string;
  posicion: string;
  tipo: string;
};

export type PdfReflectiveGroup = {
  /** Nombres de las tallas que comparten esta configuración. */
  sizeNames: string[];
  specs: PdfReflectiveSpec[];
};

export type PdfDetailAddons = {
  embroideryGroups: PdfEmbroideryGroup[];
  reflectiveGroups: PdfReflectiveGroup[];
  hasSleeveCut: boolean;
};

// ---------------------------------------------------------------------------
// Helpers privados de agrupación
// ---------------------------------------------------------------------------

type Tallas = QuoteById["detalles"][number]["tallas"];

const buildPdfEmbroideryGroups = (tallas: Tallas): PdfEmbroideryGroup[] => {
  const groupMap = new Map<string, PdfEmbroideryGroup>();
  let counter = 0;

  for (const talla of tallas) {
    if (!talla.lleva_bordado || !talla.bordado_config) continue;
    const key = JSON.stringify(talla.bordado_config);
    if (!groupMap.has(key)) {
      counter++;
      groupMap.set(key, {
        label: `Bordado ${counter}`,
        notes: talla.bordado_config.notas?.trim() ?? "",
        sizeNames: [],
        locations: talla.bordado_config.ubicaciones.map((loc) => ({
          codigo: loc.codigo,
          ancho_cm: loc.ancho_cm,
          alto_cm: loc.alto_cm,
          color_hilo: loc.color_hilo,
          imagen: loc.imagen,
        })),
      });
    }
    groupMap.get(key)!.sizeNames.push(talla.talla_nombre);
  }

  return Array.from(groupMap.values());
};

const buildPdfReflectiveGroups = (tallas: Tallas): PdfReflectiveGroup[] => {
  const groupMap = new Map<string, PdfReflectiveGroup>();

  for (const talla of tallas) {
    if (!talla.lleva_reflejante || !talla.reflejante_config?.length) continue;
    const key = JSON.stringify(talla.reflejante_config);
    if (!groupMap.has(key)) {
      groupMap.set(key, { sizeNames: [], specs: talla.reflejante_config });
    }
    groupMap.get(key)!.sizeNames.push(talla.talla_nombre);
  }

  return Array.from(groupMap.values());
};

const buildPdfDetailAddons = (detail: QuoteById["detalles"][number]): PdfDetailAddons => ({
  embroideryGroups: buildPdfEmbroideryGroups(detail.tallas),
  reflectiveGroups: buildPdfReflectiveGroups(detail.tallas),
  hasSleeveCut: detail.tallas.some((t) => t.lleva_corte_manga),
});

// ---------------------------------------------------------------------------
// Modelo principal
// ---------------------------------------------------------------------------

export type QuotePdfModel = {
  customerName: string;
  formattedDate: string;
  totalPieces: number;
  shippingAddress: string;
  detailRows: QuoteEmailDetailRow[];
  sizesSummaries: string[];
  computedSubtotal: number;
  /** Addons por índice, alineado con detailRows. */
  detailAddons: PdfDetailAddons[];
  formatMoney: (amount: number) => string;
};

/** Arma el modelo completo listo para ser consumido por QuotePdfDocument. */
export const buildQuotePdfModel = (quote: QuoteById): QuotePdfModel => {
  const detailRows = buildQuoteEmailDetailRows(quote);

  return {
    customerName: quote.cliente_nombre || quote.cliente_razon_social || "-",
    formattedDate: formatQuoteDateTime(quote.created_at, "d 'de' MMMM yyyy"),
    totalPieces: getQuoteTotalPieces(quote),
    shippingAddress: getQuoteShippingAddress(quote),
    detailRows,
    sizesSummaries: detailRows.map(({ detail }) => getQuoteDetailSizesSummary(detail)),
    computedSubtotal: getQuoteComputedSubtotal(detailRows),
    detailAddons: detailRows.map(({ detail }) => buildPdfDetailAddons(detail)),
    formatMoney: (amount) => formatCurrency(amount),
  };
};
