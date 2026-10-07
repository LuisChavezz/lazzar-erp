/**
 * Contrato del onboarding de factura por piezas
 * (`GET|POST /finanzas/facturas/onboarding/`).
 *
 * Un pedido se factura en PARCIALIDADES: cada factura toma piezas de tallas
 * concretas (`pedido_detalle_talla`) y nunca más de las pendientes. Toda
 * factura activa no cancelada aparta sus piezas, Borrador incluido, así que el
 * flujo se repite (GET → POST) hasta que no quede nada pendiente.
 */

// ─── Respuesta cruda del GET (`?pedido={id}`) ───────────────────────────────

/** Una talla del pedido tal como la devuelve el backend. */
export interface InvoiceOnboardingApiTalla {
  pedido_detalle_talla: number;
  pedido_detalle: number;
  /**
   * `null` en renglones externos (fuera de catálogo, p. ej. muestras): el GET
   * los devuelve, pero el POST los rechaza.
   */
  producto: number | null;
  /**
   * Nombre del producto, o el nombre externo en renglones fuera de catálogo;
   * `null` si ese renglón externo no tiene nombre capturado.
   */
  producto_nombre: string | null;
  talla: number;
  talla_nombre: string;
  /** Precio SIN IVA como string decimal ("269.00"); "0" si la línea no tiene precio. */
  precio_unitario: string;
  cantidad_pedida: number;
  cantidad_facturada: number;
  cantidad_pendiente: number;
}

export interface InvoiceOnboardingApiResponse {
  pedido: number;
  pedido_folio: string | null;
  /** Tasa de IVA del pedido como string decimal ("16"). */
  porcentaje_impuesto: string;
  total_piezas_pedidas: number;
  total_piezas_facturadas: number;
  total_piezas_pendientes: number;
  tallas: InvoiceOnboardingApiTalla[];
}

// ─── Modelo normalizado (lo que consumen hooks y componentes) ───────────────

/**
 * Talla con los strings numéricos ya convertidos en el servicio: el precio en
 * CENTAVOS enteros (para estimar importes sin aritmética de punto flotante).
 * El resto de los campos conserva el nombre de la API.
 */
export interface InvoiceOnboardingTalla
  extends Omit<InvoiceOnboardingApiTalla, "precio_unitario"> {
  precio_unitario_centavos: number;
  /** ¿Puede facturarse? Tiene producto de catálogo y piezas pendientes. */
  facturable: boolean;
}

export interface InvoiceOnboardingData
  extends Omit<InvoiceOnboardingApiResponse, "porcentaje_impuesto" | "tallas"> {
  /** Tasa de IVA como número (16, 8.5…). */
  porcentaje_impuesto: number;
  tallas: InvoiceOnboardingTalla[];
}

// ─── Cuerpo del POST ────────────────────────────────────────────────────────

/**
 * Cuerpo de `POST /finanzas/facturas/onboarding/`. SOLO `pedido` y las líneas:
 * el servidor deriva producto, precio, impuesto y folio. El backend acepta otros
 * campos (`serie_folio`, `activo`, fechas, observaciones) pero no deben enviarse.
 */
export interface InvoiceOnboardingPayload {
  pedido: number;
  factura_detalles: {
    pedido_detalle_talla: number;
    /** Piezas enteras > 0 y ≤ lo pendiente de la talla. */
    cantidad: number;
  }[];
}
