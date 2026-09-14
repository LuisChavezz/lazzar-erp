/**
 * Contrato de `GET /finanzas/facturas-proveedor/` (`FacturaProveedorSerializer`,
 * `fields = "__all__"` más `proveedor_nombre` y `moneda_codigo` de solo lectura,
 * y los renglones anidados `factura_proveedor_detalles`). Nombres de llaves EN
 * ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Vive en `accounts-payable/` porque aquí solo se LEE: es el catálogo del
 * selector de factura del alta manual de CxP. No hay pantalla de facturas de
 * proveedor en el frontend; si algún día se construye, estos tipos deberían
 * mudarse a ese módulo y `accounts-payable` importarlos (el mismo camino que
 * siguió `CuentaPorPagar` al salir de `payments`).
 *
 * Arreglo PLANO (sin paginación), decimales como STRING y fechas "YYYY-MM-DD".
 * La respuesta es PESADA —cada factura trae sus renglones anidados—, por eso el
 * listado se pide siempre acotado por proveedor (ver `useFacturasProveedor`).
 */

/** Estatus de la factura de proveedor, tal cual el enum del backend. */
export type FacturaProveedorEstatus = "Borrador" | "Registrada" | "Cancelada";

/** Renglón de `factura_proveedor_detalles`. */
export interface FacturaProveedorDetalle {
  id: number;
  /** FK a la factura padre. Solo lectura en el serializer. */
  factura_proveedor: number;
  /** FK a `compras.OrdenCompraDetalle`. */
  oc_detalle: number;
  /** FK a `compras.RecepcionDetalle`. */
  recepcion_detalle: number;
  /** FK a `catalogo.Producto`. */
  producto: number;
  /** Decimal en string. */
  cantidad: string;
  /** Decimal en string. */
  precio_unitario: string;
  /** Decimal en string. */
  descuento: string;
  /** Decimal en string. */
  impuesto: string;
  /** Decimal en string. */
  subtotal: string;
  /** Decimal en string. */
  total: string;
}

export interface FacturaProveedor {
  id: number;
  /** FK a `nucleo.Empresa`. La resuelve el backend; solo lectura. */
  empresa: number;
  /** FK a `nucleo.Sucursal`. */
  sucursal: number;
  /** FK a `terceros.Proveedor`. La CxP que nazca de esta factura DEBE llevarlo. */
  proveedor: number;
  /** FK a `compras.OrdenCompra`. */
  oc: number;
  /** FK a `compras.Recepcion`. */
  recepcion: number;
  /** FK a `nucleo.Moneda`. */
  moneda: number;
  /** Calculado (`source="proveedor.nombre"`), solo lectura. */
  proveedor_nombre: string | null;
  /** Calculado (`source="moneda.codigo_iso"`), solo lectura. */
  moneda_codigo: string | null;
  /** Fecha "YYYY-MM-DD". `auto_now_add` en el modelo, así que nunca es nula. */
  fecha_emision: string;
  /**
   * Fecha "YYYY-MM-DD", o `null`. Es la que el backend copia a la CxP cuando el
   * alta no manda una propia.
   */
  fecha_vencimiento: string | null;
  folio: string | null;
  /** Decimal en string. */
  subtotal: string;
  /** Decimal en string. */
  descuento: string;
  /** Decimal en string. */
  impuestos: string;
  /**
   * Decimal en string. La CxP que nazca de esta factura DEBE llevar exactamente
   * este total (el backend los cruza).
   */
  total: string;
  estatus: FacturaProveedorEstatus;
  observaciones: string | null;
  /** Bandera del modelo (`default=True`). */
  activo: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Renglones anidados. Puede venir vacío. */
  factura_proveedor_detalles: FacturaProveedorDetalle[];
}

/**
 * Parámetros de `GET /finanzas/facturas-proveedor/`, todos opcionales. El
 * `get_queryset` acepta también `oc`, `recepcion`, rango de `fecha_emision` y
 * `ordering` (y los alias `proveedor_id`/`moneda_id`); aquí solo se declaran los
 * que el selector usa.
 */
export interface FacturaProveedorQueryParams {
  proveedor?: number;
  /** Un solo valor. */
  estatus?: FacturaProveedorEstatus;
  /** Búsqueda parcial (`icontains`) sobre el folio. */
  folio?: string;
  moneda?: number;
}
