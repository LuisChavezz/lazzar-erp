import type { DocumentCancellationFields } from "@/src/features/document-cancellation/interfaces/document-cancellation.interface";

/**
 * Contrato de `/finanzas/facturas-proveedor/` (`FacturaProveedorSerializer`,
 * `exclude = ["pdf_adjunto"]` más `proveedor_nombre`, `moneda_codigo`,
 * `oc_folio`, `recepcion_folio` y `tiene_pdf_adjunto` de solo lectura,
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
  /**
   * FK a `compras.OrdenCompraDetalle`. Debe pertenecer a la OC de la factura.
   * `null` en la factura de maquila (sin OC, nucleo-erp #1242).
   */
  oc_detalle: number | null;
  /**
   * FK a `compras.RecepcionDetalle`. Debe pertenecer a la recepción de la
   * factura. Puede ser `null` en la de maquila de una SM de OB/OR.
   */
  recepcion_detalle: number | null;
  /**
   * FK a `catalogo.Producto`. Debe coincidir con el de `oc_detalle` y
   * `recepcion_detalle`. `null` en un renglón de maquila sin producto (SM de
   * OB/OR): lo que se facturó va en `descripcion`.
   */
  producto: number | null;
  /** Texto del renglón; en la factura de maquila, la descripción del renglón de la SM. */
  descripcion?: string | null;
  /** Renglón de la SM del que nació el de la factura de maquila (#1242); `null` en las demás. */
  salida_maquila_detalle?: number | null;
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
  /**
   * Nombre y código del producto (EC-904). SOLO en listado y retrieve (no en
   * las respuestas de alta o edición), por eso opcionales; el código es `null`
   * si el producto no tiene. Los lee el PDF. `null` sin producto (maquila).
   */
  producto_nombre?: string | null;
  producto_codigo?: string | null;
}

export interface FacturaProveedor extends DocumentCancellationFields {
  id: number;
  /** FK a `nucleo.Empresa`. La resuelve el backend; solo lectura. */
  empresa: number;
  /** FK a `nucleo.Sucursal`. */
  sucursal: number;
  /** FK a `terceros.Proveedor`. La CxP que nazca de esta factura DEBE llevarlo. */
  proveedor: number;
  /**
   * FK a `compras.OrdenCompra`. `null` en la factura de maquila que nace al
   * recibir una SM (nucleo-erp #1217, EC-912): no tiene OC.
   */
  oc: number | null;
  /** SM de la que nació la factura de maquila (EC-912); `null` en las demás. */
  salida_maquila?: number | null;
  /** Folio de esa SM (nucleo-erp #1233), tal cual; `null` en las demás. */
  salida_maquila_folio?: string | null;
  /** FK a `compras.Recepcion`. NOT NULL. */
  recepcion: number;
  /** FK a `nucleo.Moneda`. */
  moneda: number;
  /** Calculado (`source="proveedor.nombre"`), solo lectura. */
  proveedor_nombre: string | null;
  /** Calculado (`source="moneda.codigo_iso"`), solo lectura. */
  moneda_codigo: string | null;
  /**
   * Folio de la OC, solo lectura (EC-466). `null` mientras la OC está en
   * Borrador (el folio de la OC se asigna después) y en la factura de maquila,
   * que no tiene OC: desde nucleo-erp #1233 la llave viene siempre. Opcional
   * en el tipo por las respuestas de alta y edición.
   */
  oc_folio?: string | null;
  /** Folio de la recepción, solo lectura (EC-466). Nunca nulo. */
  recepcion_folio: string;
  /**
   * Fecha "YYYY-MM-DD", nunca nula: `DateField(default=timezone.localdate)`
   * NOT NULL. Opcional y editable en el serializer (si el alta no la envía, toma
   * el día local de hoy); no admite `null`.
   */
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
  /**
   * Solo lectura (EC-397). `true` si la factura tiene adjunto el PDF del
   * proveedor; es la condición del documento fusionado OC + RC + factura
   * (`pdf-fusionado/` responde 400 sin él). Se escribe solo por `adjuntar-pdf/`.
   */
  tiene_pdf_adjunto: boolean;
  /**
   * Nombre ORIGINAL del PDF adjunto, o `null` si no hay. Lo fija `adjuntar-pdf/`.
   * OJO: el serializer del backend NO lo marca de solo lectura (usa
   * `exclude = ["pdf_adjunto"]`), así que POST/PATCH lo aceptarían; el frontend
   * nunca lo envía (no está en `CreateFacturaProveedorPayload` ni en
   * `UpdateFacturaProveedorPayload`), para no desalinearlo del archivo real.
   */
  pdf_adjunto_nombre: string | null;
  /** Renglones anidados. Puede venir vacío. */
  factura_proveedor_detalles: FacturaProveedorDetalle[];
}

/**
 * Respuesta 200 de `POST /finanzas/facturas-proveedor/{id}/adjuntar-pdf/`.
 *
 * Solo trae los dos campos del adjunto —NO la factura—, así que quien invalida
 * cachés toma `estatus` y `oc` de la fila que ya tenía.
 */
export interface AdjuntarPdfFacturaProveedorResponse {
  tiene_pdf_adjunto: boolean;
  pdf_adjunto_nombre: string | null;
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
  /** Facturas de maquila de una SM (nucleo-erp #1233). */
  salida_maquila?: number;
}

/**
 * Renglón del cuerpo de `POST /finanzas/facturas-proveedor/{id}/ajustar-maquila/`
 * (nucleo-erp #1242): solo viajan los campos que cambian. Decimales con 2
 * posiciones, >= 0. `impuesto` es un MONTO, no una tasa.
 */
export interface AjusteMaquilaLinea {
  id: number;
  precio_unitario?: string;
  descuento?: string;
  impuesto?: string;
}

export interface AjusteMaquilaPayload {
  lineas: AjusteMaquilaLinea[];
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
 * Omite `empresa` (la resuelve el servidor), `fecha_emision` (su default es el día local de hoy),
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
 * "Registrar" (`{ estatus: "Registrada" }`). Cancelar NO va por aquí
 * (EC-950): el `PATCH` a `Cancelada` no pide motivo ni deja rastro; la UI
 * elimina un `Borrador` (`DELETE`) y cancela una `Registrada` con
 * `POST cancelar/` y motivo. Por eso `estatus` solo admite `Registrada`.
 */
export interface UpdateFacturaProveedorPayload {
  folio?: string | null;
  fecha_vencimiento?: string | null;
  observaciones?: string | null;
  estatus?: "Registrada";
}
