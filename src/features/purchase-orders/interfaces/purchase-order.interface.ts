import type { PurchaseOrderDetalleItem } from "./purchase-order-onboarding.interface";
import type { ReceiptDetail } from "@/src/features/receipts/interfaces/receipt.interface";

//
// ─── Relaciones resueltas por el backend ────────────────────────────────────
//

/**
 * Pedido de venta ligado a la orden de compra, ya resuelto por el backend
 * (mismo helper `armar_pedido_vinculado` que alimenta bordado, reflejante,
 * corte de manga y producción, por lo que la forma es idéntica a la de esos
 * módulos). Se declara con nombre —y no en línea como allá— porque aquí
 * convive con {@link DocumentoLigado} y la sección de documentos del detalle
 * los usa juntos.
 *
 * `null` cuando la orden no nace de un pedido (compra de abasto directa): el
 * FK `pedido` es `SET_NULL`.
 */
export interface PedidoVinculado {
  id: number;
  folio: string;
}

/**
 * Tipos de documento que el backend puede ligar a una orden de compra.
 *
 * NO se comparte con `PedidoDocumento` (`orders/interfaces/order.interface.ts`),
 * que tiene la MISMA forma de campos pero un universo de `tipo` distinto
 * (`orden_bordado`, `cotizacion`, `packing`…): son dos grafos de documentos
 * diferentes y unificarlos permitiría escribir un `tipo` imposible en el otro
 * lado. Si un día convergen, se unifican entonces.
 */
export type TipoDocumentoOC =
  | "pedido"
  | "solicitud_compra"
  | "recepcion"
  | "factura_proveedor"
  | "movimiento_inventario";

/** Documento relacionado con la orden de compra, resuelto por el backend. */
export interface DocumentoLigado {
  id: number;
  tipo: TipoDocumentoOC;
  label: string;
  folio: string;
  fecha: string | null;
  estatus: string | null;
}

//
// ─── Orden de compra ────────────────────────────────────────────────────────
//

/**
 * Orden de compra tal como la devuelven TANTO el listado
 * (`GET /compras/ordenes/`) como el detalle (`GET /compras/ordenes/{id}/`):
 * el serializer de retrieve expone esta misma cabecera y solo AÑADE las
 * relaciones anidadas (ver {@link PurchaseOrderDetail}).
 *
 * ── Campos financieros AUSENTES por rol ──────────────────────────────────────
 * `subtotal`, `descuento`, `impuestos`, `total`, `flete`, `seguros`,
 * `porcentaje_iva`, `total_iva`, `gran_total` y `a_cuenta` van marcados
 * OPCIONALES a propósito: el backend no los pone en `null`, ELIMINA la clave de
 * la respuesta cuando el usuario no tiene un rol con visibilidad financiera
 * (mismo filtro por rol que ya documenta `Order` en el pedido 360°). Un importe
 * ausente no es cero: formatearlo con `Number()` daría `$NaN`. Usar siempre
 * `formatMoneyValueOrDash` (`@/src/utils/formatCurrency`), que devuelve "—".
 */
export interface PurchaseOrder {
  id: number;
  /**
   * Folio de la orden. `null` mientras el backend no lo asigna — verificado
   * contra producción: 4 de 15 órdenes del listado lo traen nulo, todas en
   * estatus 2 (pendiente a confirmar). Cualquier render debe llevar respaldo
   * (`?? "—"`, o `Orden #{id}` cuando es el título de la vista): sin él, un
   * folio nulo deja un `<button>` de folio SIN contenido, que colapsa a 0×0 px
   * y queda invisible e inclicable.
   */
  folio: string | null;
  referencia: string;
  fecha_oc: string;
  fecha_entrega_estimada: string | null;
  fecha_autorizacion: string | null;
  fecha_vencimiento: string | null;
  estatus: number;
  estatus_label: string;
  tipo: string;
  total_piezas: number;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;

  // ── Relaciones (id crudo + nombre resuelto) ───────────────────────────────
  empresa: number;
  empresa_nombre: string;
  sucursal: number;
  sucursal_nombre: string;
  proveedor: number;
  /**
   * Nombre del proveedor, resuelto por el backend. `null` cuando la orden no
   * tiene proveedor: el FK es `SET_NULL` y `get_proveedor_nombre` devuelve
   * `None` si `proveedor_id` es falsy. Renderizar siempre con respaldo.
   */
  proveedor_nombre: string | null;
  /**
   * Correo del proveedor. Puede ser `null` cuando no hay proveedor asignado O
   * cuando el proveedor no tiene correo capturado — validar presencia antes de
   * habilitar el envío.
   */
  proveedor_correo: string | null;
  usuario: number;
  usuario_nombre: string;
  moneda: number;
  /** Código ISO 4217 ("MXN", "USD"). Es el que consume `Intl`/`formatCurrency`. */
  moneda_codigo: string;
  /**
   * Símbolo capturado en el catálogo de monedas ("$", "US$"). `null` cuando no
   * se capturó. NO se usa para formatear —`Intl` deriva el símbolo del código—;
   * queda disponible para etiquetas donde se quiera mostrar el símbolo suelto.
   */
  moneda_simbolo: string | null;
  solicitud_compra: number | null;
  pedido: number | null;
  /**
   * Doblemente nullable: el FK `pedido` es `SET_NULL` (compra de abasto sin
   * pedido madre) y `Pedido.folio` es a su vez nullable.
   */
  pedido_folio: string | null;

  // ── Financieros — pueden faltar por rol, ver el bloque del docstring ──────
  subtotal?: string;
  descuento?: string;
  impuestos?: string;
  total?: string;
  flete?: string;
  seguros?: string;
  porcentaje_iva?: string;
  total_iva?: string;
  gran_total?: string;
  a_cuenta?: string;
}

//
// ─── Detalle de la orden de compra ──────────────────────────────────────────
//

/**
 * Un renglón de producto dentro del detalle de la orden de compra.
 *
 * `precio`, `descuento` e `importe` son opcionales por el MISMO filtro de rol
 * que los financieros de la cabecera (ver {@link PurchaseOrder}): la clave se
 * elimina de la respuesta, no llega en `null`.
 */
export interface PurchaseOrderDetalle {
  /** PK del renglón (no del producto) — la usa `key` al renderizar la tabla. */
  id: number;
  /** Id del producto del catálogo — expuesto por `OrdenCompraDetalleReadSerializer`. */
  producto_id: number;
  /** Nombre del producto en el catálogo. `descripcion` es el texto capturado en la orden. */
  producto_nombre: string;
  descripcion: string;
  cantidad: number;
  piezas: number;
  precio?: string;
  descuento?: string;
  importe?: string;
}

/**
 * Recepción embebida en la respuesta de detalle de la orden de compra
 * (`recepciones[]` de GET /compras/ordenes/{id}/). Su forma es idéntica, campo
 * por campo, a la respuesta del recurso dedicado GET /compras/recepciones/{id}/,
 * por lo que se reutiliza {@link ReceiptDetail} en lugar de redefinirla — incluye
 * el mismo arreglo anidado `detalles: ReceiptDetailLine[]` (vacío cuando la
 * recepción aún no registra líneas).
 */
export type PurchaseOrderReceipt = ReceiptDetail;

/**
 * Respuesta del endpoint GET /compras/ordenes/{id}/.
 *
 * La cabecera es la MISMA que la del listado ({@link PurchaseOrder}); el
 * retrieve solo añade lo de aquí abajo. `fecha_vencimiento`, `tipo`,
 * `total_piezas` y los financieros SÍ viven en la base porque el listado los
 * trae igual — se verificó campo por campo contra la respuesta real.
 *
 * `pedido_vinculado` y `documentos`, en cambio, son EXCLUSIVOS del retrieve:
 * el serializer del listado no los expone (verificado contra producción,
 * comparando las claves de `GET /compras/ordenes/` con las de
 * `GET /compras/ordenes/{id}/`). Declararlos en la base haría creer que una
 * fila del listado puede enlazar a su pedido, y ahí siempre serían `undefined`.
 */
export interface PurchaseOrderDetail extends PurchaseOrder {
  detalles: PurchaseOrderDetalle[];
  /** Recepciones (parciales o totales) generadas contra esta orden; `[]` si no hay ninguna. */
  recepciones: PurchaseOrderReceipt[];
  pedido_vinculado: PedidoVinculado | null;
  /** Documentos relacionados; `[]` cuando la orden no tiene ninguno. */
  documentos: DocumentoLigado[];
}

//
// ─── Actualización de la orden de compra (PUT) ──────────────────────────────
//

/**
 * Campos editables del encabezado de la orden, derivados de {@link PurchaseOrder}
 * vía `Pick`. Se omiten los campos generados por el servidor (id, folio, estatus,
 * totales, fechas de auditoría, etc.).
 */
export type UpdatePurchaseOrderHeader = Pick<
  PurchaseOrder,
  | "referencia"
  | "fecha_oc"
  | "observaciones"
  | "sucursal"
  | "proveedor"
  | "moneda"
>;

/**
 * Cuerpo de la petición `PUT /compras/ordenes/{pk}/`.
 *
 * Refleja la forma del alta: encabezado editable + arreglo de renglones
 * (`detalles`), de modo que los productos se actualizan junto con el encabezado.
 * Los items reutilizan {@link PurchaseOrderDetalleItem} (la misma forma que el
 * detalle del POST de onboarding: `producto`, `cantidad`, `precio`,
 * `descripcion`).
 *
 * No existe un `CreatePurchaseOrderBody` equivalente al que aliasar: el alta usa
 * un POST de onboarding en dos partes (`{ orden_compra }` y `{ orden_compra_id,
 * detalle }`), de forma anidada y distinta a este cuerpo plano.
 */
export type UpdatePurchaseOrderBody = UpdatePurchaseOrderHeader & {
  detalles: PurchaseOrderDetalleItem[];
};

/** Parámetros para la acción de actualización de una orden de compra. */
export interface UpdatePurchaseOrderParams {
  pk: number;
  body: UpdatePurchaseOrderBody;
}
