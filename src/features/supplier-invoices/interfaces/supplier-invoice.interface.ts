/**
 * Contrato de `/finanzas/facturas-proveedor/` (`FacturaProveedorSerializer`,
 * `fields = "__all__"` más `proveedor_nombre` y `moneda_codigo` de solo lectura,
 * y los renglones anidados `factura_proveedor_detalles`). Nombres de llaves EN
 * ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Estos tipos vivían en `accounts-payable/`, que solo LEÍA facturas para su
 * selector del alta manual de CxP. Se mudaron aquí al nacer el módulo de
 * facturas de proveedor; `accounts-payable/interfaces/factura-proveedor.interface.ts`
 * los re-exporta para no romper a sus consumidores.
 *
 * Arreglo PLANO (sin paginación), decimales como STRING y fechas "YYYY-MM-DD".
 * La respuesta es PESADA —cada factura trae sus renglones anidados—, así que el
 * listado conviene pedirlo acotado (por proveedor, OC o recepción).
 *
 * ─── EL ESTATUS DECIDE LA CxP ────────────────────────────────────────────────
 *
 * Pasar a `Registrada` genera UNA cuenta por pagar (`saldo = total`,
 * `Pendiente`, vencimiento copiado de la factura). Ocurre tanto al CREAR ya
 * registrada (`perform_create`, dentro de la misma transacción atómica que la
 * cabecera y sus renglones) como al pasar `Borrador → Registrada` por PATCH
 * (`perform_update`). Mientras exista una CxP viva (no `Cancelada`), la factura
 * ya no puede cambiar `total`, `proveedor` ni `moneda`, ni volver a `Borrador` o
 * `Cancelada`.
 */

/** Estatus de la factura de proveedor, tal cual el enum del backend. */
export type FacturaProveedorEstatus = "Borrador" | "Registrada" | "Cancelada";

/** Renglón de `factura_proveedor_detalles`. */
export interface FacturaProveedorDetalle {
  id: number;
  /** FK a la factura padre. Solo lectura en el serializer. */
  factura_proveedor: number;
  /** FK a `compras.OrdenCompraDetalle`. Debe pertenecer a la OC de la factura. */
  oc_detalle: number;
  /** FK a `compras.RecepcionDetalle`. Debe pertenecer a la recepción de la factura. */
  recepcion_detalle: number;
  /** FK a `catalogo.Producto`. Debe coincidir con el de `oc_detalle` y `recepcion_detalle`. */
  producto: number;
  /** Decimal(18,2) en string. */
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
  /** FK a `compras.OrdenCompra`. NOT NULL. */
  oc: number;
  /** FK a `compras.Recepcion`. NOT NULL. */
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
   * Fecha "YYYY-MM-DD", o `null`. Es la que el backend copia a la CxP. Una
   * factura registrada SIN vencimiento genera una CxP que nunca aparece como
   * vencida.
   */
  fecha_vencimiento: string | null;
  /** Nullable y NO único: dos facturas pueden compartir folio. */
  folio: string | null;
  /** Decimal en string. */
  subtotal: string;
  /** Decimal en string. */
  descuento: string;
  /** Decimal en string. */
  impuestos: string;
  /**
   * Decimal en string. El backend NO lo valida contra nada —ni contra los
   * renglones ni contra `subtotal − descuento + impuestos`—: guarda lo que
   * mande el cliente y la CxP lo copia tal cual.
   */
  total: string;
  estatus: FacturaProveedorEstatus;
  observaciones: string | null;
  /** Bandera del modelo (`default=True`). */
  activo: boolean;
  /**
   * `DateTimeField(default=timezone.now)`: ESCRIBIBLE por el cliente (no es
   * `auto_now_add`). Esta pantalla no lo envía — el default del modelo es el
   * correcto—, pero el tipo no debe fingir que es de solo lectura.
   */
  created_at: string | null;
  updated_at: string | null;
  /** Renglones anidados. Puede venir vacío. */
  factura_proveedor_detalles: FacturaProveedorDetalle[];
}

/**
 * Parámetros de `GET /finanzas/facturas-proveedor/`, todos opcionales. El
 * `get_queryset` acepta también rango de `fecha_emision` y `ordering` (y los
 * alias `proveedor_id`/`moneda_id`/`orden_compra`/`recepcion_id`).
 */
export interface FacturaProveedorQueryParams {
  proveedor?: number;
  /** Un solo valor. */
  estatus?: FacturaProveedorEstatus;
  /** Búsqueda parcial (`icontains`) sobre el folio. */
  folio?: string;
  moneda?: number;
  oc?: number;
  recepcion?: number;
}

/**
 * Renglón del cuerpo de alta. NO lleva `factura_proveedor` (solo lectura en el
 * serializer: el padre se resuelve al anidar) ni `id`.
 */
export interface CreateFacturaProveedorDetallePayload {
  oc_detalle: number;
  recepcion_detalle: number;
  producto: number;
  /** Decimal en string con 2 posiciones: el campo es Decimal(18,2). */
  cantidad: string;
  precio_unitario: string;
  descuento: string;
  impuesto: string;
  subtotal: string;
  total: string;
}

/**
 * Cuerpo de `POST /finanzas/facturas-proveedor/`.
 *
 * Tipo SEPARADO del de lectura: es la costura entre los valores del formulario y
 * lo que viaja al API (`buildSupplierInvoicePayload`).
 *
 * Omite `empresa` (la resuelve el servidor), `fecha_emision` (`auto_now_add`),
 * `created_at`/`updated_at` (sus defaults son los correctos), `activo` y los
 * campos calculados.
 *
 * `estatus` admite `Borrador` o `Registrada`: a diferencia de las pólizas —que
 * contabilizan por una acción aparte—, crear la factura ya `Registrada` es la vía
 * soportada para registrarla en un paso (`perform_create` genera la CxP en la
 * misma transacción). `Cancelada` no se crea nunca desde el alta.
 */
export interface CreateFacturaProveedorPayload {
  sucursal: number;
  proveedor: number;
  oc: number;
  recepcion: number;
  moneda: number;
  fecha_vencimiento: string | null;
  folio: string | null;
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
  estatus: Exclude<FacturaProveedorEstatus, "Cancelada">;
  observaciones: string | null;
  factura_proveedor_detalles: CreateFacturaProveedorDetallePayload[];
}

/**
 * Cuerpo de `PATCH /finanzas/facturas-proveedor/{id}/` — parcial: solo viajan
 * las llaves presentes.
 *
 * NUNCA lleva `factura_proveedor_detalles`: el serializer los declara de
 * escritura solo en el alta (`nested_write_on_create_only`), así que un PATCH los
 * ignoraría en silencio. Tampoco lleva los importes de cabecera: se derivan de
 * los renglones y los renglones ya no cambian.
 *
 * Sirve a la edición de cabecera de un borrador y a las dos acciones de fila:
 * "Registrar" (`{ estatus: "Registrada" }`) y "Cancelar"
 * (`{ estatus: "Cancelada" }`). No hay acción `/cancelar/` en este ViewSet:
 * cancelar ES este PATCH. `CuentaPorPagarService.ensure_invoice_edit_keeps_account`
 * lo rechaza solo si la factura tiene una CxP viva, que un `Borrador` no puede
 * tener (volver de `Registrada` a `Borrador` está bloqueado por la misma regla);
 * por eso la UI ofrece cancelar únicamente sobre borradores.
 */
export interface UpdateFacturaProveedorPayload {
  folio?: string | null;
  fecha_vencimiento?: string | null;
  observaciones?: string | null;
  estatus?: FacturaProveedorEstatus;
}
