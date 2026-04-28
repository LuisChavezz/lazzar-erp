/**
 * Funciones puras para preparar la informacion del template de correo.
 * No renderizan React ni hacen IO; solo transforman datos de `QuoteById`.
 */
import type { QuoteById } from "../interfaces/quote.interface";

/** Fila ya preparada para la tabla de productos del correo. */
export type QuoteEmailDetailRow = {
  detail: QuoteById["detalles"][number];
  quantity: number;
  lineSubtotal: number;
};

/**
 * Convierte un monto a centavos para reducir errores tipicos de precision decimal.
 */
const toMoneyCents = (value?: string | number | null) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * 100);
};

/** Suma la cantidad total de piezas dentro de un detalle a partir de sus tallas. */
export const getQuoteDetailQuantity = (detail: QuoteById["detalles"][number]) =>
  detail.tallas.reduce((sum, size) => sum + (Number(size.cantidad) || 0), 0);

/** Suma todas las piezas de la cotizacion para el resumen y seccion de totales. */
export const getQuoteTotalPieces = (quote: QuoteById) =>
  quote.detalles.reduce((total, detail) => total + getQuoteDetailQuantity(detail), 0);

/** Genera un texto compacto de tallas y cantidades para mostrarlo en la tabla del correo. */
export const getQuoteDetailSizesSummary = (detail: QuoteById["detalles"][number]) => {
  const sizes = detail.tallas
    .map((size) => `${size.talla_nombre}: ${Number(size.cantidad) || 0}`)
    .join(", ");

  return sizes || "-";
};

/** Construye una direccion de envio legible concatenando solo las partes disponibles. */
export const getQuoteShippingAddress = (quote: QuoteById) => {
  const parts = [
    quote.direccion_envio,
    quote.colonia_envio,
    quote.codigo_postal,
    quote.ciudad_envio,
    quote.estado_envio,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "-";
};

/**
 * Proyecta cada detalle a una fila lista para la tabla del template.
 * El subtotal de linea se recalcula aqui porque el backend no lo garantiza.
 */
export const buildQuoteEmailDetailRows = (quote: QuoteById): QuoteEmailDetailRow[] =>
  quote.detalles.map((detail) => {
    const quantity = getQuoteDetailQuantity(detail);
    const lineSubtotal = (toMoneyCents(detail.precio_unitario) * quantity) / 100;

    return {
      detail,
      quantity,
      lineSubtotal,
    };
  });

/** Suma todos los subtotales de linea para obtener el subtotal mostrado en el correo. */
export const getQuoteComputedSubtotal = (detailRows: QuoteEmailDetailRow[]) =>
  detailRows.reduce((total, row) => total + row.lineSubtotal, 0);

// ---------------------------------------------------------------------------
// Tipos y builders para addons (bordados, reflejantes, corte de manga)
// ---------------------------------------------------------------------------

export type EmailEmbroideryLocation = {
  codigo: string;
  ancho_cm: number;
  alto_cm: number;
  color_hilo: string | null;
  imagen: string;
};

export type EmailEmbroideryGroup = {
  label: string;
  notes: string;
  sizeNames: string[];
  locations: EmailEmbroideryLocation[];
};

export type EmailReflectiveSpec = {
  opcion: string;
  posicion: string;
  tipo: string;
};

export type EmailReflectiveGroup = {
  sizeNames: string[];
  specs: EmailReflectiveSpec[];
};

export type EmailDetailAddons = {
  embroideryGroups: EmailEmbroideryGroup[];
  reflectiveGroups: EmailReflectiveGroup[];
  hasSleeveCut: boolean;
};

type TallasList = QuoteById["detalles"][number]["tallas"];

const buildEmailEmbroideryGroups = (tallas: TallasList): EmailEmbroideryGroup[] => {
  const groupMap = new Map<string, EmailEmbroideryGroup>();
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

const buildEmailReflectiveGroups = (tallas: TallasList): EmailReflectiveGroup[] => {
  const groupMap = new Map<string, EmailReflectiveGroup>();

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

const buildEmailDetailAddons = (detail: QuoteById["detalles"][number]): EmailDetailAddons => ({
  embroideryGroups: buildEmailEmbroideryGroups(detail.tallas),
  reflectiveGroups: buildEmailReflectiveGroups(detail.tallas),
  hasSleeveCut: detail.tallas.some((t) => t.lleva_corte_manga),
});

/**
 * Builder principal que arma el modelo consumido por la plantilla.
 * Agrupa calculos repetidos para mantener el componente del correo presentacional.
 */
export const buildQuoteEmailTemplateModel = (quote: QuoteById) => {
  const detailRows = buildQuoteEmailDetailRows(quote);

  return {
    customerName: quote.cliente_nombre || quote.cliente_razon_social,
    totalPieces: getQuoteTotalPieces(quote),
    shippingAddress: getQuoteShippingAddress(quote),
    detailRows,
    computedSubtotal: getQuoteComputedSubtotal(detailRows),
    detailAddons: detailRows.map(({ detail }) => buildEmailDetailAddons(detail)),
  };
};
