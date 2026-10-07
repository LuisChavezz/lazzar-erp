import type { InvoiceEstatus } from "./invoice.interface";

/**
 * Contrato de `GET /finanzas/facturas/{id}/desglose/`: la factura completa
 * para consulta (página de detalle). Solo la consume `/finance/invoicing/[id]`;
 * el PDF y el correo siguen saliendo del retrieve (`Invoice`).
 *
 * - Acotado por empresa: la factura de otra empresa responde 404, igual que una
 *   inexistente. También responde para facturas eliminadas (`activo=false`),
 *   pero sin exponer `activo`: eso se lee del retrieve.
 * - Importes como string decimal ("2395.00"); cantidades como enteros; fechas
 *   ISO ("YYYY-MM-DD" las de calendario, datetime solo `created_at`).
 * - Factura "por monto" (sin renglones): `conceptos` vacío y
 *   `importes.total_piezas` en 0, con los importes llenos.
 */

// ─── Respuesta cruda ────────────────────────────────────────────────────────

/** Clave SAT con su descripción (`{ codigo, descripcion }`). */
export interface InvoiceDesgloseSatKey {
  codigo: string;
  descripcion: string | null;
}

export interface InvoiceDesgloseEmisor {
  empresa: number;
  razon_social: string | null;
  nombre_comercial: string | null;
  rfc: string | null;
  sucursal: number;
  sucursal_nombre: string | null;
}

/**
 * Receptor. Cada dato fiscal sale de la foto congelada en el pedido y, campo
 * por campo, cae al del cliente si el pedido no lo trae: un mismo receptor
 * puede mezclar ambas fuentes.
 */
export interface InvoiceDesgloseReceptor {
  cliente: number;
  nombre: string | null;
  razon_social: string | null;
  rfc: string | null;
  regimen_fiscal: InvoiceDesgloseSatKey | null;
  codigo_postal: string | null;
  correo_facturas: string | null;
}

export interface InvoiceDesglosePedido {
  id: number;
  folio: string | null;
  oc: string | null;
  forma_pago: string | null;
  forma_pago_nombre: string | null;
  metodo_pago: string | null;
  metodo_pago_nombre: string | null;
  uso_cfdi: string | null;
  uso_cfdi_nombre: string | null;
}

export interface InvoiceDesgloseMoneda {
  id: number;
  codigo_iso: string;
  nombre: string | null;
  simbolo: string | null;
}

export interface InvoiceDesgloseProducto {
  id: number;
  nombre: string | null;
  codigo: string | null;
  descripcion: string | null;
  unidad_medida: string | null;
  sat_clave_prodserv: InvoiceDesgloseSatKey | null;
  sat_clave_unidad: InvoiceDesgloseSatKey | null;
}

/** Un renglón de la factura: las piezas de una talla del pedido. */
export interface InvoiceDesgloseApiTalla {
  factura_detalle: number;
  pedido_detalle_talla: number | null;
  talla: number | null;
  talla_nombre: string | null;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  descuento: string;
  porcentaje_impuesto: string | null;
  impuesto: string;
  total: string;
  /** Piezas de esa talla en el pedido; `null` sin talla o sin pedido. */
  cantidad_pedida: number | null;
  /** Lo que le queda pendiente a la talla en TODO el pedido (no en esta factura). */
  cantidad_pendiente_pedido: number | null;
}

/** Un renglón del pedido con sus tallas facturadas en esta factura. */
export interface InvoiceDesgloseApiConcepto {
  pedido_detalle: number;
  producto: InvoiceDesgloseProducto;
  color: { id: number; nombre: string | null } | null;
  cantidad: number;
  subtotal: string;
  descuento: string;
  impuesto: string;
  total: string;
  tallas: InvoiceDesgloseApiTalla[];
}

/** Totales GUARDADOS de la factura (no se recalculan de los renglones). */
export interface InvoiceDesgloseApiImportes {
  total_piezas: number;
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
}

/**
 * Piezas del pedido completo. Cuenta las facturas activas no canceladas,
 * Borrador incluido. Los tres valores vienen del servidor y no se derivan uno
 * de otro: una talla facturada de más no resta pendientes a las demás.
 */
export interface InvoiceDesgloseAvancePedido {
  piezas_pedidas: number;
  piezas_facturadas: number;
  piezas_pendientes: number;
}

/** Factura del mismo pedido (activa, Cancelada incluida). */
export interface InvoiceDesgloseApiParcialidad {
  id: number;
  folio: string | null;
  estatus: InvoiceEstatus;
  fecha_emision: string;
  total: string;
  es_esta_factura: boolean;
}

/** Cuenta por cobrar de la factura (cualquier estatus). */
export interface InvoiceDesgloseApiCobranza {
  id: number;
  estatus: string;
  total: string;
  saldo: string;
  fecha_vencimiento: string | null;
  fecha_ultimo_pago: string | null;
}

/** Nota de crédito de la factura (cualquier estatus). */
export interface InvoiceDesgloseApiNotaCredito {
  id: number;
  folio: string | null;
  estatus: string;
  motivo: string | null;
  fecha_emision: string | null;
  total: string;
}

export interface InvoiceDesgloseApiResponse {
  id: number;
  folio: string | null;
  estatus: InvoiceEstatus;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  created_at: string;
  emisor: InvoiceDesgloseEmisor;
  receptor: InvoiceDesgloseReceptor;
  pedido: InvoiceDesglosePedido | null;
  moneda: InvoiceDesgloseMoneda;
  conceptos: InvoiceDesgloseApiConcepto[];
  importes: InvoiceDesgloseApiImportes;
  avance_pedido: InvoiceDesgloseAvancePedido | null;
  parcialidades: InvoiceDesgloseApiParcialidad[];
  cobranza: InvoiceDesgloseApiCobranza[];
  notas_credito: InvoiceDesgloseApiNotaCredito[];
}

// ─── Modelo normalizado ─────────────────────────────────────────────────────
// Mismos nombres de campo que la API; los importes ya como `number` (y la tasa
// de impuesto como `number | null`). La conversión ocurre en el schema, al
// validar la respuesta en el servicio.

type Amounts<T, K extends keyof T> = Omit<T, K> & { [P in K]: number };

export type InvoiceDesgloseTalla = Amounts<
  Omit<InvoiceDesgloseApiTalla, "porcentaje_impuesto">,
  "precio_unitario" | "subtotal" | "descuento" | "impuesto" | "total"
> & { porcentaje_impuesto: number | null };

export type InvoiceDesgloseConcepto = Amounts<
  Omit<InvoiceDesgloseApiConcepto, "tallas">,
  "subtotal" | "descuento" | "impuesto" | "total"
> & { tallas: InvoiceDesgloseTalla[] };

export type InvoiceDesgloseImportes = Amounts<
  InvoiceDesgloseApiImportes,
  "subtotal" | "descuento" | "impuestos" | "total"
>;

export type InvoiceDesgloseParcialidad = Amounts<InvoiceDesgloseApiParcialidad, "total">;

export type InvoiceDesgloseCobranza = Amounts<InvoiceDesgloseApiCobranza, "total" | "saldo">;

export type InvoiceDesgloseNotaCredito = Amounts<InvoiceDesgloseApiNotaCredito, "total">;

export interface InvoiceDesglose
  extends Omit<
    InvoiceDesgloseApiResponse,
    "conceptos" | "importes" | "parcialidades" | "cobranza" | "notas_credito"
  > {
  conceptos: InvoiceDesgloseConcepto[];
  importes: InvoiceDesgloseImportes;
  parcialidades: InvoiceDesgloseParcialidad[];
  cobranza: InvoiceDesgloseCobranza[];
  notas_credito: InvoiceDesgloseNotaCredito[];
}
