import type { PurchaseOrderDetalleItem } from "./purchase-order-onboarding.interface";
import type { ReceiptDetail } from "@/src/features/receipts/interfaces/receipt.interface";
import type { TipoCompra } from "../constants/purchaseOrderTipoCompra";

//
// ─── Relaciones resueltas por el backend ────────────────────────────────────
//

/**
 * Pedido de venta ligado a la orden de compra, ya resuelto por el backend
 * (`{ id, folio }`). Es la forma de cada elemento de `pedidos_vinculados` y
 * también la de `pedido_vinculado` del detalle (mismo helper
 * `armar_pedido_vinculado` que alimenta bordado, reflejante, corte de manga y
 * producción).
 *
 * `folio` puede ser `null`: `Pedido.folio` es nullable.
 */
export interface PedidoVinculado {
  id: number;
  folio: string | null;
}

/**
 * Tipo de compra de la orden. Decide la serie del folio al confirmarla
 * (`aceptar`): `MP` (materia prima, el default del backend) o `PT` (producto
 * terminado). Se deriva del mapa de etiquetas de
 * `constants/purchaseOrderTipoCompra.ts`, su fuente única.
 */
export type { TipoCompra };

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
   * Folio de la orden. `null` mientras el backend no lo asigna. Suele ocurrir
   * en estatus 2 (pendiente a confirmar), pero NO es exclusivo de ese estatus:
   * en datos reales hay órdenes sin folio en 3 (autorizada, p. ej. la OC 160)
   * y en 6 (cancelada), así que no debe asumirse que una orden confirmada o
   * más avanzada siempre trae folio. Cualquier render debe llevar respaldo
   * (`?? "—"`, o `Orden #{id}` cuando es el título de la vista): sin él, un
   * folio nulo deja un `<button>` de folio SIN contenido, que colapsa a 0×0 px
   * y queda invisible e inclicable.
   */
  folio: string | null;
  /**
   * Opcional en el alta y la edición: el backend guarda `""` como `null`, así
   * que una orden sin referencia llega con `null`.
   */
  referencia: string | null;
  fecha_oc: string;
  fecha_entrega_estimada: string | null;
  fecha_autorizacion: string | null;
  fecha_vencimiento: string | null;
  estatus: number;
  estatus_label: string;
  tipo: string;
  total_piezas: number;
  observaciones: string | null;
  /**
   * Motivo capturado al cancelar la orden (`POST ordenes/{id}/cancelar/`),
   * solo lectura. Llega TANTO en el listado como en el detalle (verificado
   * contra el backend); `null` cuando la orden no está cancelada.
   */
  motivo_cancelacion: string | null;
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
  /**
   * FK LEGADO de un solo pedido. Una orden puede ligar VARIOS pedidos (ver
   * `pedidos`); este campo solo refleja uno de ellos y no tiene por qué
   * coincidir con `pedidos[0]`. No lo uses para mostrar los pedidos de la
   * orden ni lo mandes al guardar: usa `pedidos` / `pedidos_vinculados`.
   */
  pedido: number | null;
  /** Folio del pedido LEGADO (`pedido`); doblemente nullable. Ver `pedido`. */
  pedido_folio: string | null;
  /**
   * Ids de TODOS los pedidos ligados a la orden (`[]` si ninguno). El backend
   * NO garantiza su orden: no hay un pedido "principal".
   */
  pedidos: number[];
  /** Los mismos pedidos que `pedidos`, ya con su folio. Mismo aviso de orden. */
  pedidos_vinculados: PedidoVinculado[];
  tipo_compra: TipoCompra;
  /** Etiqueta del backend para `tipo_compra` ("Materia prima"/"Producto terminado"). */
  tipo_compra_label: string;

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
  /**
   * Solo el pedido del FK LEGADO (`pedido`), no todos los ligados: para
   * mostrar los pedidos de la orden usa `pedidos_vinculados`.
   */
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
 * totales, fechas de auditoría, etc.), incluida `fecha_oc`: la fija el servidor
 * al crear la orden y el PUT la ignora. `fecha_vencimiento` va siempre
 * ("yyyy-mm-dd" o `null` para borrarla).
 *
 * - `pedidos` va SIEMPRE: reemplaza la lista completa (`[]` desliga todos,
 *   incluido el FK legado). El campo legado `pedido` nunca se manda.
 * - `tipo_compra` es opcional: se OMITE cuando la orden ya tiene folio (el
 *   backend rechaza cambiarlo y el formulario lo bloquea).
 */
export type UpdatePurchaseOrderHeader = Pick<
  PurchaseOrder,
  | "referencia"
  | "fecha_vencimiento"
  | "observaciones"
  | "sucursal"
  | "proveedor"
  | "moneda"
  | "pedidos"
> & {
  tipo_compra?: TipoCompra;
};

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

//
// ─── Cancelación de la orden de compra ──────────────────────────────────────
//

/**
 * Cuerpo de `POST /compras/ordenes/{id}/cancelar/`. El motivo es obligatorio:
 * en blanco el backend responde 400 con
 * `{ "motivo_cancelacion": "El motivo de cancelación es requerido." }`.
 */
export interface CancelPurchaseOrderPayload {
  motivo_cancelacion: string;
}

/** Parámetros para la acción de cancelación de una orden de compra. */
export interface CancelPurchaseOrderParams {
  id: number;
  payload: CancelPurchaseOrderPayload;
}

/**
 * Renglón tal como lo devuelven el PUT y el POST de onboarding (ambos responden
 * con la misma función del backend): el modelo plano del detalle (FKs como
 * ids), distinto de {@link PurchaseOrderDetalle} del retrieve. Forma observada
 * contra la respuesta real del backend.
 */
export interface UpdatePurchaseOrderResponseDetalle {
  id: number;
  descripcion: string;
  cantidad: number;
  precio: string;
  descuento: string;
  importe: string;
  piezas: number;
  orden_compra: number;
  producto: number;
  solicitud_compra_detalle: number | null;
  requisicion_detalle: number | null;
  sucursal: number;
}

/**
 * Respuesta de `PUT /compras/ordenes/{pk}/` y de `POST
 * /compras/ordenes/onboarding/` (la misma función del backend): la cabecera
 * (misma forma que el listado) envuelta en `orden_compra` y los renglones en
 * `detalle`. NO es un {@link PurchaseOrder} plano. Del PUT nadie la consume:
 * tras guardar, la vista se refresca invalidando las queries.
 */
export interface UpdatePurchaseOrderResponse {
  orden_compra: PurchaseOrder;
  detalle: UpdatePurchaseOrderResponseDetalle[];
}

/** Parámetros para la acción de actualización de una orden de compra. */
export interface UpdatePurchaseOrderParams {
  pk: number;
  body: UpdatePurchaseOrderBody;
}
