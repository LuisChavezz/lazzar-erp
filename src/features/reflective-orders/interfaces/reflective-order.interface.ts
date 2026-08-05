/**
 * Contratos del endpoint de órdenes de reflejante
 * (`/produccion/orden-reflejante/`).
 *
 * Verificados contra el esquema OpenAPI DESPLEGADO (`/api/schema/`, componentes
 * `OrdenReflejante` / `OrdenReflejanteDetalle` / `EstatusReflejanteEnum`) y
 * contra el checkout de `nucleo-erp` (`produccion/models.py`,
 * `produccion/api/serializers.py`) — ambos coinciden.
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 *
 * OJO — no confundir con `features/quotes/**`, donde "reflejante" es un ADDON de
 * una partida de cotización (`lleva_reflejante` / `reflejante_config`, ver
 * `useReflectiveState`). Aquí es la ORDEN DE TRABAJO que se emite a producción
 * a partir de esas partidas: modelos, endpoints y ciclos de vida distintos.
 */

/**
 * Estatus de una orden de reflejante (`OrdenesReflejante.EstatusReflejante`,
 * enteros 1-7).
 *
 * En la práctica SIEMPRE llega `1` (Pendiente): las DOS rutas que crean
 * órdenes hoy lo dejan en ese valor —`ventas` lo escribe literal
 * (`estatus_reflejante=1`) y `OrdenReflejanteService.save` ni siquiera lo pasa,
 * así que toma el default del modelo— y no existe endpoint que lo avance
 * (`OrdenReflejanteViewSet` solo expone `list`/`retrieve`/`create`/`destroy`/
 * `onboarding`; `PUT`/`PATCH` → 405).
 *
 * Se tipan los 7 igual, para que empezar a usarlos no requiera tocar el
 * frontend — mismo criterio que `EmbroideryOrderStatus`/`PackingEstado`.
 *
 * DIFERENCIA con bordado: el `3` de reflejante es `Aplicando` (el de bordado es
 * `Bordando`). Los enums son gemelos en forma pero NO en etiquetas; no se
 * comparten.
 */
export type ReflectiveOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Renglón de `detalles`, embebido en cada orden del listado (el backend usa el
 * mismo `OrdenReflejanteSerializer` para listado y detalle). Se tipa completo
 * aunque este listado solo lo resuma: el diálogo de detalle —fase siguiente—
 * lo reutiliza tal cual.
 *
 * ESTADO REAL DE LOS CAMPOS PROPIOS DEL REFLEJANTE, que depende de QUIÉN creó
 * la orden (hay dos rutas de alta, ver `ReflectiveOrder`):
 *
 *  - `tipo_reflejante` / `posicion`: los puebla la generación automática desde
 *    ventas (los lee de `PedidoDetalleTalla.reflejante_config`), pero NO
 *    `OrdenReflejanteService.save` —el alta del módulo de producción—, que
 *    construye el detalle sin ellos y los deja en `null`.
 *  - `metros`: llega `0` SIEMPRE, por las dos rutas (ventas lo escribe literal
 *    `metros=0`; el service no lo pasa y el modelo declara
 *    `FloatField(default=0)`). Nunca es `null` — es un número que hoy nadie
 *    calcula.
 *  - `color`: lo puebla ventas (desde `pedido_detalle.color`) pero no el
 *    service del módulo, que solo fija `talla`.
 *
 * Ninguno de esos huecos es un defecto del frontend: se muestran tal cual
 * llegan.
 *
 * `cantidad` y `metros` son `FloatField`, o sea NÚMEROS en el JSON (no el
 * string decimal habitual de los campos de inventario).
 *
 * Los `*_nombre` se declaran nullable porque el backend los resuelve con un
 * `source` con punto (`talla.nombre`) sobre FKs que SÍ admiten nulo
 * (`talla`/`color` son `SET_NULL`): DRF devuelve `null` cuando el eslabón
 * intermedio no existe. El esquema OpenAPI los marca `string` requerido
 * —drf-spectacular no modela ese caso—, no porque nunca sean nulos.
 */
export interface ReflectiveOrderLine {
  id: number;
  /** FK a la orden de reflejante contenedora (`OrdenesReflejante.id`). */
  orden_r: number;
  pedido_detalle: number;
  producto: number;
  producto_nombre: string | null;
  talla: number | null;
  talla_nombre: string | null;
  color: number | null;
  color_nombre: string | null;
  cantidad: number;
  /** Ver nota del bloque: `null` en las órdenes creadas desde este módulo. */
  tipo_reflejante: string | null;
  /** Ver nota del bloque: `null` en las órdenes creadas desde este módulo. */
  posicion: string | null;
  /** Ver nota del bloque: hoy es `0` en TODAS las órdenes. */
  metros: number;
}

/**
 * Renglón de `GET /produccion/orden-reflejante/` (listado).
 *
 * `empresa` y `sucursal` viajan como ids CRUDOS, sin su `_nombre` resuelto — no
 * se muestran en la tabla. `usuario_asignado` en cambio SÍ trae su nombre
 * resuelto (`usuario_nombre`), a diferencia de bordado, que solo expone el id
 * (ver `EmbroideryOrder`): `OrdenReflejanteSerializer` declara un
 * `SerializerMethodField` que resuelve `get_full_name()` y, si queda vacío, el
 * email. Por eso este listado sí puede tener columna de operador.
 *
 * `fecha_fin` siempre llega `null` (ningún endpoint la fija) y `activo` siempre
 * `true` (el queryset filtra `activo=True`; el `DELETE` es un soft delete que
 * saca la fila del listado).
 *
 * DOS RUTAS DE ALTA, y por eso conviven dos formatos de `folio_reflejante` en
 * la misma tabla:
 *
 *  1. Automática al generar el pedido en ventas: consume la serie de folios
 *     `ORDEN_REFLEJANTE` y, si no hay serie configurada, cae al literal
 *     `OR-<folio del pedido>`. NO fija `usuario_asignado` → `usuario_nombre`
 *     llega `null`.
 *  2. Alta manual desde producción (`POST .../onboarding/`, fase siguiente):
 *     folio de `generate_or_folio` y `usuario_asignado` = el usuario
 *     autenticado.
 *
 * El folio se muestra tal cual llega, sin normalizar ni validar — misma
 * definición de negocio pendiente que en bordado.
 */
export interface ReflectiveOrder {
  id: number;
  folio_reflejante: string;
  estatus_reflejante: ReflectiveOrderStatus;
  /**
   * Entero libre: el modelo lo declara `IntegerField(default=1)` SIN `choices`,
   * así que el backend acepta cualquier entero. La UI rotula 1-3
   * (Alta/Media/Baja, el mismo mapeo del alta de órdenes de producción) y cae a
   * un badge neutro para cualquier otro valor.
   */
  prioridad: number;
  /** `auto_now_add`: es la fecha de ALTA, nunca nula. */
  fecha_inicio: string;
  /** Siempre `null` hoy — ningún endpoint la fija. */
  fecha_fin: string | null;
  observaciones: string | null;
  activo: boolean;
  empresa: number;
  /**
   * Nombre legible de la empresa (`source='empresa.razon_social'`, `Empresa` no
   * tiene campo `nombre`: su nombre humano es `razon_social`). `CharField(...,
   * read_only=True)` sobre una FK no nulable (`OrdenesReflejante.empresa` es
   * `ForeignKey(Empresa, on_delete=CASCADE)` sin `null=True`) hacia un campo
   * tampoco nulable (`Empresa.razon_social` es `CharField` sin `null=True`) —
   * por construcción, siempre string no vacío cuando la orden existe.
   *
   * OJO — verificado 2026-08 en el checkout de `nucleo-erp`
   * (`ddbdae3 feat(produccion): agrega empresa_nombre/sucursal_nombre a
   * OrdenReflejanteSerializer`), pero el esquema OpenAPI DESPLEGADO
   * (`nucleo-erp.vercel.app/api/schema/`) todavía NO lo expone: es un cambio de
   * backend confirmado en código pero aún no en producción. Se tipa
   * `string | undefined` —no el `string` que el contrato final promete— para
   * que el tipo no mienta sobre lo que el backend HOY REALMENTE envía: contra
   * el API desplegado, el campo simplemente no viene en el JSON. Se ajusta a
   * `string` cuando el backend despliegue el cambio. Se consume con
   * `textOrDash` en el diálogo de detalle (que ya acepta `undefined`), nunca
   * con acceso directo (`.trim()`, `.toUpperCase()`, etc.).
   */
  empresa_nombre: string | undefined;
  sucursal: number;
  /** Nombre legible de la sucursal (`source='sucursal.nombre'`). Misma garantía
   *  de no-nulidad y misma salvedad de despliegue que `empresa_nombre`. */
  sucursal_nombre: string | undefined;
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
  detalles: ReflectiveOrderLine[];
}

// ─── Onboarding / alta ───────────────────────────────────────────────────────

/**
 * Pedido candidato del catálogo (`GET /produccion/orden-reflejante/onboarding/`).
 *
 * El backend arma este objeto a mano en la vista (no vía serializer): son
 * pedidos activos, de la empresa del usuario y de sus `sucursales_permitidas`,
 * con AL MENOS una talla marcada `lleva_reflejante=True`, ordenados
 * `-created_at, -id`.
 *
 * OJO: el catálogo NO excluye los pedidos que ya tienen una orden de reflejante
 * activa — se puede elegir uno y recibir el 409 de duplicado. Es justamente el
 * caso que atiende el bloque ámbar de `ReflectiveOrderCreateForm`.
 *
 * `folio`, `cliente_nombre` y `sucursal_nombre` pueden ser `null`
 * (`Pedido.folio` es nullable y los nombres se leen con `getattr(..., None)`).
 */
export interface ReflectiveOnboardingPedido {
  id: number;
  folio: string | null;
  cliente: number | null;
  cliente_nombre: string | null;
  sucursal: number | null;
  sucursal_nombre: string | null;
}

/**
 * Operador del catálogo: usuarios activos de la empresa. `nombre` ya viene
 * resuelto por el backend (`get_full_name()` y, si queda vacío, el email).
 *
 * Es DECORATIVO: `usuario_asignado` está en los `read_only_fields` del
 * serializer y `OrdenReflejanteService.save` lo fija al usuario autenticado
 * (`usuario_asignado=user`) sin mirar el body. Por eso el formulario lo muestra
 * en SOLO LECTURA y NO lo envía — igual que bordado.
 */
export interface ReflectiveOnboardingOperador {
  id: number;
  nombre: string;
}

/**
 * Respuesta del onboarding.
 *
 * `preview.folio_or_sugerido` es APROXIMADO y así se rotula en la UI: el
 * backend lo calcula con la sucursal POR DEFECTO del usuario
 * (`preview_or_folio(empresa.pk, sucursal_default.pk)`), mientras que el folio
 * REAL se consume con la sucursal DEL PEDIDO
 * (`generate_or_folio(pedido.empresa_id, pedido.sucursal_id)`) — y `SerieFolio`
 * está acotada por sucursal, así que ambos difieren en cuanto el pedido elegido
 * no sea de la sucursal por defecto de quien captura. Llega `null` cuando el
 * usuario no tiene `sucursal_default` o el cálculo falla.
 *
 * El folio DEFINITIVO es siempre el `folio_reflejante` de la respuesta del
 * POST; es el único que se afirma sin reservas (ver `useCreateReflectiveOrder`).
 */
export interface ReflectiveOnboardingData {
  pedidos: ReflectiveOnboardingPedido[];
  operadores: ReflectiveOnboardingOperador[];
  preview: { folio_or_sugerido: string | null };
}

/**
 * Cuerpo de `POST /produccion/orden-reflejante/onboarding/`.
 *
 * SOLO estos tres campos. El backend deriva `empresa`/`sucursal` del pedido,
 * `usuario_asignado` del usuario autenticado y `folio_reflejante` de la serie
 * de folios; `activo`/`fecha_inicio` toman su default.
 *
 * `estatus_reflejante` y `fecha_fin` SÍ son escribibles en el serializer (a
 * diferencia de bordado, que declara `estatus_bordado` como `read_only`), pero
 * `OrdenReflejanteService.save` construye la orden campo por campo y no los
 * lee: se aceptan y se descartan en silencio. Quedan fuera de este tipo por eso
 * mismo — un campo de formulario para ellos prometería una decisión que el
 * backend ignora.
 *
 * `detalles` tampoco se envía: el service los deriva solo, uno por cada
 * `PedidoDetalleTalla` con `lleva_reflejante=True` del pedido elegido.
 */
export interface CreateReflectiveOrderPayload {
  pedido: number;
  prioridad?: number;
  observaciones?: string;
}
