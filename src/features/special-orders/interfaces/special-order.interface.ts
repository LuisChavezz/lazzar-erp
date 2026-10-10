import type { EmbroideryOnboardingUbicacion } from "@/src/features/embroidery/interfaces/embroidery.interface";
import type { ReflectiveLineConfigEntry } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";

/**
 * Pedido especial tal como lo lista `GET /produccion/pedidos-especiales/`.
 *
 * "Especial" = el pedido tiene al menos una línea de MUESTRA: un `PedidoDetalle`
 * con `producto_nombre_externo` no vacío (producto fuera de catálogo). El
 * backend lo deriva del nombre y no de `requiere_produccion`, que se
 * desincroniza (ver `_detalles_especiales_qs` en `produccion/api/views.py`).
 *
 * Respuesta LIGERA a propósito (`PedidoEspecialListSerializer`): solo lo que
 * Producción necesita para elegir cuál abrir. Arreglo plano, sin paginación ni
 * parámetros, ordenado en el servidor por `-fecha_confirmacion, -id` — en
 * Postgres los `null` van PRIMERO, así que los pedidos por confirmar encabezan
 * la lista. Ese orden se respeta tal cual.
 *
 * `folio` y `cliente_nombre` se declaran nullables igual que en `PedidoListItem`
 * (`orders/interfaces/order.interface.ts`): son las mismas columnas de `Pedido`.
 */
export interface SpecialOrderListItem {
  id: number;
  folio: string | null;
  cliente_nombre: string | null;
  /** Código crudo (`A`…`F`, `X`) o `null`; la etiqueta vive en `pedidoStatus`. */
  clasificacion: string | null;
  /** Datetime ISO con offset (medianoche local, p. ej. `…T00:00:00-06:00`) o `null`. */
  fecha_confirmacion: string | null;
}

/**
 * `bordado_config` de la talla. JSON LIBRE de la captura de ventas, así que
 * toda clave es opcional. Llega casi siempre como cascarón NO nulo aunque
 * `lleva_bordado` sea `false`: nunca se usa su presencia para decidir si el
 * servicio aplica — eso lo dice solo `lleva_bordado`.
 *
 * `tipos_servicio` no se pinta: se deriva de las banderas de técnica de cada
 * ubicación (`quotes/utils/deriveTiposServicio.ts`), que el popover de
 * ubicaciones ya muestra.
 *
 * `type` y no `interface` a propósito: un alias de objeto tiene firma de índice
 * implícita y así satisface `ServicioConfig`, el tipo que reciben los lectores
 * compartidos de `orders/utils/tallaServiceConfigs.ts`.
 */
export type SpecialOrderBordadoConfig = {
  notas?: string | null;
  ubicaciones?: EmbroideryOnboardingUbicacion[];
  tipos_servicio?: string[];
};

/** Talla de una línea especial (`PedidoDetalleTallaEspecialSerializer`). Sin precios. */
export interface SpecialOrderTalla {
  id: number;
  talla_nombre: string;
  cantidad: number;
  /**
   * SKU de producción ya generado para esta talla, o `null`. Solo refleja
   * variantes de producción ACTIVAS. El alta es todo-o-nada por línea: o todas
   * las tallas con cantidad lo traen, o ninguna.
   */
  sku_produccion: string | null;
  lleva_bordado: boolean;
  bordado_config: SpecialOrderBordadoConfig | null;
  lleva_reflejante: boolean;
  /** ARREGLO (no objeto, a diferencia de bordado) o `null`. */
  reflejante_config: ReflectiveLineConfigEntry[] | null;
  lleva_corte_manga: boolean;
  /**
   * `{ tipo: "1" }` en el 100 % de los datos reales: valor fijo que escribe el
   * formulario de cotización, sin significado conocido. Nunca se muestra.
   */
  corte_manga_config: { tipo?: string } | null;
  lleva_cambio_talla: boolean;
  /** Sin datos reales: forma desconocida. No se interpreta. */
  cambio_talla_config: unknown;
}

/** Línea de muestra del pedido (`PedidoDetalleEspecialSerializer`). */
export interface SpecialOrderLine {
  /** Id del `PedidoDetalle`: es el `pedido_detalle_id` del alta de SKU. */
  id: number;
  producto_nombre_externo: string;
  /** `null` cuando la línea no tiene color. El contrato NO expone el id del color. */
  color_nombre: string | null;
  tallas: SpecialOrderTalla[];
}

/**
 * Detalle de `GET /produccion/pedidos-especiales/{id}/`: los campos del
 * listado más `detalles`, que trae SOLO las líneas de muestra (nunca las de
 * catálogo del mismo pedido).
 *
 * NO comparte forma con el listado, así que el detalle hace su propia consulta
 * (no aplica el patrón "detalle desde la fila ya cargada").
 */
export interface SpecialOrderDetail extends SpecialOrderListItem {
  detalles: SpecialOrderLine[];
}

/**
 * Material del alta de SKU de muestra. Se captura UNA vez y el backend lo
 * replica en la lista de materiales de cada talla.
 */
export interface SampleSkuOnboardingMaterial {
  /** Id de `Producto` (materia prima, `tipo 2`) — no de variante. */
  componente: number;
  /** Decimal con 2 posiciones, por pieza. */
  cantidad: string;
  /** Id de unidad de medida. */
  unidad: number;
  /** Porcentaje con 2 posiciones. */
  desperdicio: string;
  obligatorio: boolean;
}

/**
 * Cuerpo de `POST /produccion/pedidos-especiales/{id}/variante-onboarding/`.
 *
 * `color` solo se envía cuando la línea NO tiene color: el backend lo exige en
 * ese caso y lo guarda en la línea. Si la línea ya tiene color solo acepta el
 * mismo, y como el detalle no expone su id, se omite.
 */
export interface SampleSkuOnboardingPayload {
  pedido_detalle_id: number;
  color?: number;
  materia_prima_detalle: SampleSkuOnboardingMaterial[];
}

/**
 * Variante de producción creada (`VarianteProduccionSerializer`). La respuesta
 * `201` es un ARREGLO plano con una por talla con cantidad; no trae el id del
 * BOM.
 */
export interface SampleProductionVariant {
  id: number;
  sku: string;
  nombre: string;
  talla_nombre: string;
  aplica_catalogo: boolean;
  pedido_detalle: number;
}
