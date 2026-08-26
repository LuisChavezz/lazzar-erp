/**
 * Contratos del endpoint de despacho (`/wms/despachos/`).
 *
 * `Despacho` es el modelo más delgado de toda la cadena WMS: solo dos FK
 * (`packing`, `envio`) más líneas `despacho_detalle` que referencian
 * `packing_detalle` sin cantidad, folio, estado ni timestamps propios.
 * Representa "estas cajas se entregaron a este transportista para este
 * envío" — puramente documental, sin efectos sobre inventario (la mercancía
 * ya salió del pool vendible en `Picking`, al moverse al almacén APARTADOS;
 * `Packing` y `Despacho` nunca tocan `Existencia`/`MovimientoInventario`).
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 */

/**
 * Renglón de detalle del despacho, tal cual viaja embebido en
 * `Despacho.despacho_detalle` (`DespachoDetalleReadSerializer`, confirmado
 * contra el backend — el mismo serializer para listado y detalle, ver
 * `Shipment`). `DespachoDetalle` en sí solo tiene `id`/`despacho`/
 * `packing_detalle` como columnas propias; todo lo demás lo resuelve el
 * serializer atravesando la cadena `packing_detalle → picking_detalle → ...`.
 *
 * CORRECCIÓN sobre la tipificación de la tarea de listado anterior: esa
 * versión omitía `picking_detalle`, `pedido_detalle`, `pedido_detalle_talla`,
 * `ubicacion`/`ubicacion_nombre`, `caja`/`caja_numero` y `estado` — los ocho
 * SÍ viajan en la respuesta real del backend (confirmado leyendo
 * `DespachoDetalleReadSerializer` en el checkout de `nucleo-erp`), y hacían
 * falta para el diálogo de detalle de esta tarea. Mismo tipo de corrección
 * que ya tuvo la interfaz de línea de detalle de Picking en esta misma etapa.
 *
 * `talla_id`/`color_id` son OPCIONALES de verdad (la clave puede faltar por
 * completo, no solo venir `null`): su origen en el backend es una cadena de
 * atributos con varios saltos hasta `pedido_detalle_talla` SIN `default` — si
 * `pedido_detalle_talla` es `null`, DRF revienta la cadena a medio camino y
 * omite la clave (`SkipField`) en vez de serializar `null`. Mismo patrón que
 * `talla_id` en `PackingDetalleLine`.
 *
 * `pedido_detalle_talla` NO tiene este problema pese a originarse en la misma
 * FK nullable: a diferencia de `talla_id`/`color_id` (que atraviesan el
 * OBJETO `pedido_detalle_talla`), este campo lee directamente su `_id` — un
 * acceso que Django resuelve a `None` sin lanzar excepción, así que SIEMPRE
 * viaja como clave (posiblemente `null`), nunca se omite.
 *
 * `picking_detalle`/`pedido_detalle` son FK requeridas en el modelo de origen
 * (`PickingDetalle.picking`/`PickingDetalle.pedido_detalle`) — siempre
 * presentes, nunca `null`.
 *
 * `caja`/`caja_numero` reflejan el mismo hueco ya documentado en
 * `PackingDetalleLine`: `PackingDetalle.caja` es una FK nullable sin backend
 * que la asigne hoy, así que en la práctica ambos siempre llegan `null`.
 */
export interface ShipmentDetalleLine {
  id: number;
  despacho: number;
  packing_detalle: number;
  picking_detalle: number;
  pedido_detalle: number;
  pedido_detalle_talla: number | null;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  talla_id?: number;
  talla_nombre: string | null;
  color_id?: number;
  color_nombre: string | null;
  ubicacion: number | null;
  ubicacion_nombre: string | null;
  caja: number | null;
  caja_numero: number | null;
  cantidad_empacada: string;
  estado: string;
}

/**
 * Renglón de `GET /wms/despachos/` (listado). Sin paginación ni filtros: el
 * backend devuelve el arreglo completo, ordenado `-id` (no hay timestamp
 * propio para ordenar por fecha).
 *
 * No existe un folio nativo de `Despacho` — `packing_folio` (heredado) es el
 * único identificador con trazabilidad real, por eso se usa como columna
 * principal en el listado en vez de un folio propio inexistente.
 *
 * `envio_transportista_nombre` siempre viaja `null`: `Transportista` no tiene
 * campo de nombre en el modelo actual, así que este campo nunca resuelve a un
 * valor real sin importar los datos — no es un hueco a resolver en el
 * frontend.
 *
 * `envio`/`envio_transportista` son genuinamente `null` cuando el despacho se
 * registró sin envío — el camino que toma hoy todo despacho creado desde este
 * frontend, ya que `Envio` no tiene forma de crearse fuera del admin de
 * Django (ver `CreateShipmentPayload`). No es un hueco de datos a resolver,
 * es el estado real de la mayoría de los despachos.
 */
export interface Shipment {
  id: number;
  packing: number;
  envio: number | null;
  packing_folio: string;
  packing_estado: string;
  pedido: number;
  pedido_folio: string | null;
  cliente: number;
  cliente_nombre: string;
  sucursal: number;
  sucursal_nombre: string;
  envio_transportista: number | null;
  envio_transportista_nombre: string | null;
  despacho_detalle: ShipmentDetalleLine[];
}

/**
 * Una línea de `despacho_detalle` a ENVIAR en la creación. `packing_detalle`
 * es el ÚNICO campo que el serializer acepta por línea: no hay cantidad
 * (despachar es binario por línea), ni caja, ni observaciones.
 *
 * Distinta de `ShipmentDetalleLine` (forma de LECTURA del listado) y de
 * `ShipmentOnboardingLine` (forma CANDIDATA del onboarding) — las tres viven
 * bajo la clave `despacho_detalle` en sus respectivos endpoints pero son
 * shapes distintos, por eso se tipan por separado.
 */
export interface CreateShipmentDetalleLine {
  packing_detalle: number;
}

/**
 * Cuerpo de `POST /wms/despachos/` (idéntico a `POST .../onboarding/`).
 *
 * `envio` NO forma parte de este tipo, a propósito. Es nullable en el backend
 * desde la migración `0010_alter_despacho_envio`, pero hoy no existe forma de
 * crear un `Envio` fuera del admin de Django, así que no hay nada que
 * seleccionar; se OMITE del body en vez de mandarse como `null` explícito
 * (ambas rutas son equivalentes para el backend, omitir es la más limpia).
 *
 * Consecuencia a tener presente: como tampoco existe `PATCH`/`PUT` sobre
 * `Despacho`, un despacho creado sin envío NO puede recibir uno después por
 * API. El formulario lo advierte de forma explícita antes de enviar (ver
 * `ShippingCreateForm`).
 *
 * `empresa`/`sucursal`/`pedido`/`cliente` los deriva el backend del `packing`
 * elegido — mismo criterio que `CreatePackingPayload`.
 */
export interface CreateShipmentPayload {
  packing: number;
  despacho_detalle: CreateShipmentDetalleLine[];
}
