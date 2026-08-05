/**
 * Contratos del endpoint de órdenes de corte de manga
 * (`/produccion/orden-corte-manga/`).
 *
 * Verificados contra el esquema OpenAPI DESPLEGADO (`/api/schema/`, componentes
 * `OrdenesCorteManga` / `OrdenCorteMangaDetalle` / `EstatusCorteEnum`) y contra
 * el checkout de `nucleo-erp` (`produccion/models.py`,
 * `produccion/api/serializers.py`, `produccion/api/views.py`,
 * `produccion/services/orden_corte_manga_service.py`) — ambos coinciden.
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 *
 * OJO — no confundir con `features/quotes/**`, donde "corte de manga" es un
 * ADDON de una partida de cotización (`lleva_corte_manga` /
 * `corte_manga_config`). Aquí es la ORDEN DE TRABAJO que se emite a producción
 * a partir de esas partidas: modelos, endpoints y ciclos de vida distintos.
 */

/**
 * Estatus de una orden de corte de manga (`OrdenesCorteManga.EstatusCorte`,
 * enteros 1-7).
 *
 * En la práctica SIEMPRE llega `1` (Pendiente): `estatus_corte` está en los
 * `read_only_fields` del serializer, así que ninguna ruta de alta puede
 * escribir otro valor, y no existe endpoint que lo avance
 * (`OrdenesCorteMangaViewSet` solo expone `list`/`retrieve`/`create`/`destroy`/
 * `onboarding`; `PUT`/`PATCH` → 405).
 *
 * Se tipan los 7 igual, para que empezar a usarlos no requiera tocar el
 * frontend — mismo criterio que `ReflectiveOrderStatus`/`EmbroideryOrderStatus`.
 * El valor se lee TAL CUAL llega de la base de datos; el badge no asume
 * `PENDIENTE` (ver `CORTE_MANGA_ORDER_STATUS_CONFIG`).
 *
 * DIFERENCIA con reflejante y bordado: el `3` aquí es `Cortando` (reflejante:
 * `Aplicando`; bordado: `Bordando`). Los tres enums son gemelos en forma pero
 * NO en etiquetas; no se comparten configs.
 */
export type CorteMangaOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Renglón de `detalles`, embebido en cada orden del listado (el backend usa el
 * mismo `OrdenesCorteMangaSerializer` para listado y detalle). Se tipa completo
 * aunque este listado solo lo resuma: el diálogo de detalle —fase siguiente— lo
 * reutiliza tal cual.
 *
 * ESTADO REAL DE `color` Y `configuracion`: llegan `null` en TODAS las órdenes
 * de hoy. Las escribe quien crea la orden, y de las tres rutas de alta que
 * existen en el código solo UNA está viva:
 *
 *  - `OrdenCorteMangaService.save` (la ÚNICA viva; es la que atienden
 *    `POST /produccion/orden-corte-manga/` y `.../onboarding/`) construye cada
 *    detalle con `pedido_detalle`/`producto_id`/`cantidad`/`talla` y nada más:
 *    deja `color` y `configuracion` en su default `null`.
 *  - La generación automática al autorizar una cotización
 *    (`ventas/api/views.py::_generar_ordenes_corte_manga`) SÍ poblaba ambos
 *    (`color=pedido_detalle.color`, `configuracion=talla.corte_manga_config`),
 *    pero su llamada está COMENTADA desde una decisión de negocio del
 *    2026-07-31: las órdenes de trabajo se generan solo manualmente desde sus
 *    módulos. El método se conserva para cuando se habilite un endpoint
 *    dedicado.
 *  - La generación de órdenes de trabajo desde picking
 *    (`wms/services/picking_pipeline/work_orders.py::generar_ordenes`) puebla
 *    `configuracion`, pero NADIE la invoca: `PickingService` descarta los flags
 *    `generar_orden_*` y devuelve `ordenes_trabajo_generadas = []`.
 *
 * O sea: `color`/`configuracion` en `null` NO son un defecto del frontend ni un
 * dato faltante que haya que rellenar — se muestran tal cual llegan. Solo filas
 * históricas anteriores al 2026-07-31 pueden traerlos poblados.
 *
 * `cantidad` es un `FloatField`, o sea un NÚMERO en el JSON (no el string
 * decimal habitual de los campos de inventario).
 *
 * Los `*_nombre` se declaran nullable porque el backend los resuelve con un
 * `source` con punto (`talla.nombre`) sobre FKs que SÍ admiten nulo
 * (`talla`/`color` son `SET_NULL`): DRF devuelve `null` cuando el eslabón
 * intermedio no existe. El esquema OpenAPI los marca `string` requerido
 * —drf-spectacular no modela ese caso—, no porque nunca sean nulos.
 */
export interface CorteMangaOrderLine {
  id: number;
  /** FK a la orden de corte de manga contenedora (`OrdenesCorteManga.id`). */
  ocm: number;
  pedido_detalle: number;
  producto: number;
  producto_nombre: string | null;
  talla: number | null;
  talla_nombre: string | null;
  color: number | null;
  color_nombre: string | null;
  cantidad: number;
  /**
   * `JSONField(null=True)` de forma LIBRE — el esquema OpenAPI lo declara sin
   * `type`, solo `nullable: true`. Se tipa `unknown` y no con una forma
   * inventada: hoy llega `null` siempre (ver la nota del bloque) y la única
   * forma conocida que ALGUNA VEZ se escribió aquí es la
   * `corte_manga_config` de ventas (`{ tipo: string } | null`, ver
   * `features/quotes`), que ninguna ruta viva copia. `unknown` obliga a
   * estrechar en el punto de uso el día que se renderice, en vez de confiar en
   * una forma que nadie garantiza.
   */
  configuracion: unknown;
}

/**
 * Renglón de `GET /produccion/orden-corte-manga/` (listado).
 *
 * `empresa` y `sucursal` viajan como ids CRUDOS, pero —a diferencia de lo que
 * podía hacer reflejante cuando se construyó su listado— sus nombres resueltos
 * (`empresa_nombre`/`sucursal_nombre`) YA están DESPLEGADOS: el esquema OpenAPI
 * en producción los declara `string` requerido, y el serializer los produce con
 * `source='empresa.razon_social'` / `source='sucursal.nombre'` sobre FKs no
 * nulables (`CASCADE`, sin `null=True`) hacia campos tampoco nulables. Por eso
 * se tipan `string` a secas, sin el `| undefined` defensivo de
 * `ReflectiveOrder`, y por eso este listado sí puede tener columna de sucursal.
 *
 * `usuario_asignado` también trae su nombre resuelto (`usuario_nombre`): un
 * `SerializerMethodField` que devuelve `get_full_name()` y, si queda vacío, el
 * email.
 *
 * `fecha_fin` siempre llega `null` (ningún endpoint la fija) y `activo` siempre
 * `true` (el queryset filtra `activo=True`; el `DELETE` es un soft delete que
 * saca la fila del listado).
 *
 * RUTA DE ALTA: hoy solo una, `OrdenCorteMangaService.save`, que fija
 * `usuario_asignado` = usuario autenticado y consume el folio de la serie
 * `ORDEN_CORTE_MANGA` (`generate_ocm_folio`). La generación automática desde
 * ventas —que NO asignaba usuario y caía al literal `OCM-<folio del pedido>` si
 * no había serie configurada— está deshabilitada desde el 2026-07-31 (ver
 * `CorteMangaOrderLine`). De ahí que `usuario_nombre` se tipe nullable pese a
 * que las altas NUEVAS siempre lo traigan: las filas históricas de esa ruta sí
 * pueden tenerlo en `null`, y por eso mismo pueden convivir dos formatos de
 * `folio_ocm` en la misma tabla. El folio se muestra tal cual llega, sin
 * normalizar ni validar.
 */
export interface CorteMangaOrder {
  id: number;
  folio_ocm: string;
  estatus_corte: CorteMangaOrderStatus;
  /**
   * Entero libre: el modelo lo declara `IntegerField(default=1)` SIN `choices`,
   * así que el backend acepta cualquier entero (el esquema OpenAPI lo confirma:
   * `integer` con los límites de un `int32`, sin enum). La UI rotula 1-3
   * (Alta/Media/Baja, el mismo mapeo del alta de órdenes de producción y de los
   * listados de bordado/reflejante) y cae a un badge neutro para cualquier otro
   * valor.
   */
  prioridad: number;
  /** `auto_now_add`: es la fecha de ALTA, nunca nula. */
  fecha_inicio: string;
  /** Siempre `null` hoy — ningún endpoint la fija. */
  fecha_fin: string | null;
  observaciones: string | null;
  activo: boolean;
  empresa: number;
  /** Nombre legible de la empresa (`source='empresa.razon_social'`, `Empresa`
   *  no tiene campo `nombre`). Ver la nota del bloque: desplegado y no nulable. */
  empresa_nombre: string;
  sucursal: number;
  /** Nombre legible de la sucursal (`source='sucursal.nombre'`). Misma garantía
   *  que `empresa_nombre`. */
  sucursal_nombre: string;
  pedido: number;
  /** `Pedido.folio` es nullable: puede llegar `null`. */
  pedido_folio: string | null;
  usuario_asignado: number | null;
  /**
   * Nombre ya resuelto del operador (`get_full_name()` o, en su defecto, el
   * email). `null` cuando `usuario_asignado` lo es — el `SerializerMethodField`
   * corta con `return None`, aunque el esquema OpenAPI lo marque `string`
   * requerido (drf-spectacular no infiere el tipo de retorno de un
   * `SerializerMethodField`).
   */
  usuario_nombre: string | null;
  detalles: CorteMangaOrderLine[];
}

// ─── Onboarding / alta ───────────────────────────────────────────────────────

/**
 * Pedido candidato del catálogo
 * (`GET /produccion/orden-corte-manga/onboarding/`).
 *
 * El backend arma este objeto a mano en la vista (no vía serializer): son
 * pedidos activos, de la empresa del usuario y de sus `sucursales_permitidas`,
 * con AL MENOS una talla marcada `lleva_corte_manga=True`, ordenados
 * `-created_at, -id`.
 *
 * OJO: el catálogo NO excluye los pedidos que ya tienen una orden de corte de
 * manga activa — se puede elegir uno y recibir el 409 de duplicado. Es
 * justamente el caso que atiende el bloque ámbar de
 * `CorteMangaOrderCreateForm`.
 *
 * `folio`, `cliente_nombre` y `sucursal_nombre` pueden ser `null`
 * (`Pedido.folio` es nullable y los nombres se leen con `getattr(..., None)`).
 */
export interface CorteMangaOnboardingPedido {
  id: number;
  folio: string | null;
  cliente: number | null;
  cliente_nombre: string | null;
  sucursal: number | null;
  sucursal_nombre: string | null;
}

/**
 * Operador del catálogo: usuarios activos de la empresa
 * (`Usuario.objects.filter(empresa=empresa, is_active=True)`). `nombre` ya
 * viene resuelto por el backend (`get_full_name().strip()` y, si queda vacío,
 * el email).
 *
 * NO ES UN SELECTOR DE ASIGNACIÓN, y conviene ser explícito porque el nombre
 * del catálogo lo sugiere: `usuario_asignado` está en los `read_only_fields`
 * del serializer y `OrdenCorteMangaService.save` lo fija al usuario autenticado
 * (`usuario_asignado=user`) sin mirar el body. Su ÚNICO uso en el frontend es
 * resolver cómo NOMBRAR a ese usuario en la UI: se busca el id de la sesión
 * dentro de este arreglo para reutilizar el nombre que el backend ya resolvió,
 * en vez de recomponerlo en el cliente (ver `resolveAssignedOperator`). Por eso
 * el formulario lo muestra en SOLO LECTURA y no lo envía — igual que reflejante
 * y bordado.
 */
export interface CorteMangaOnboardingOperador {
  id: number;
  nombre: string;
}

/**
 * Respuesta del onboarding.
 *
 * `preview.folio_ocm_sugerido` es APROXIMADO y así se rotula en la UI: el
 * backend lo calcula con la sucursal POR DEFECTO del usuario
 * (`preview_ocm_folio(empresa.pk, sucursal_default.pk)`), mientras que el folio
 * REAL se consume con la sucursal DEL PEDIDO
 * (`generate_ocm_folio(pedido.empresa_id, pedido.sucursal_id)`) — y
 * `SerieFolio` está acotada por sucursal, así que ambos difieren en cuanto el
 * pedido elegido no sea de la sucursal por defecto de quien captura. Llega
 * `null` cuando el usuario no tiene `sucursal_default` o el cálculo falla.
 *
 * El folio DEFINITIVO es siempre el `folio_ocm` de la respuesta del POST; es el
 * único que se afirma sin reservas (ver `useCreateCorteMangaOrder`).
 */
export interface CorteMangaOnboardingData {
  pedidos: CorteMangaOnboardingPedido[];
  operadores: CorteMangaOnboardingOperador[];
  preview: { folio_ocm_sugerido: string | null };
}

/**
 * Cuerpo de `POST /produccion/orden-corte-manga/onboarding/`.
 *
 * SOLO estos tres campos. El backend deriva `empresa`/`sucursal` del pedido,
 * `usuario_asignado` del usuario autenticado y `folio_ocm` de la serie de
 * folios; `estatus_corte`/`activo`/`fecha_inicio` toman su default.
 *
 * El esquema OpenAPI desplegado (`OrdenesCorteMangaRequest`) declara exactamente
 * cuatro campos escribibles —`pedido` (requerido), `prioridad`, `observaciones`
 * y `fecha_fin`— y `pedido` es el único obligatorio. `fecha_fin` queda FUERA de
 * este tipo: el serializer lo acepta, pero `OrdenCorteMangaService.save`
 * construye la orden campo por campo y nunca lo lee, así que se aceptaría y se
 * descartaría en silencio; un campo de formulario para él prometería una
 * decisión que el backend ignora.
 *
 * DIFERENCIA con reflejante: allá `estatus_reflejante` TAMBIÉN es escribible (y
 * también se descarta). Aquí `estatus_corte` es `read_only` en el serializer, de
 * modo que el backend ni siquiera lo admite — una razón menos para que este tipo
 * lo incluya.
 *
 * `detalles` tampoco se envía: el service los deriva solo, uno por cada
 * `PedidoDetalleTalla` con `lleva_corte_manga=True` del pedido elegido (orden
 * COMPLETA, sin selección por talla).
 */
export interface CreateCorteMangaOrderPayload {
  pedido: number;
  prioridad?: number;
  observaciones?: string;
}
