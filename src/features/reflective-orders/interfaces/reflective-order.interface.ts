/**
 * Contratos del endpoint de órdenes de reflejante
 * (`/produccion/orden-reflejante/`).
 *
 * Verificados contra el esquema OpenAPI DESPLEGADO (`/api/schema/`, componentes
 * `OrdenReflejanteList` / `OrdenReflejanteRetrieve` /
 * `OrdenReflejanteDetalleList` / `OrdenReflejanteDetalleRetrieve` /
 * `EstatusReflejanteEnum`) y contra el checkout de `nucleo-erp`
 * (`produccion/models.py`, `produccion/api/serializers.py`) — ambos coinciden.
 * El onboarding NO aparece en el esquema (la vista arma su respuesta a mano,
 * sin serializer): esa parte está verificada solo contra el código.
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
 * Renglón de `detalles`, embebido en cada orden del LISTADO
 * (`OrdenReflejanteDetalleListSerializer`).
 *
 * Listado y detalle DEJARON de compartir serializer: el del listado es
 * deliberadamente ligero (no declara `reflejante_config`/`ubicaciones`/`foto`/
 * `notas`, que obligaban a re-leer `PedidoDetalleTalla` una vez por renglón), y
 * solo el detalle paga ese costo. Por eso `ReflectiveOrderDetailLine` EXTIENDE
 * este tipo en vez de sustituirlo.
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
   * Este campo se tipaba `string | undefined` porque el esquema OpenAPI
   * DESPLEGADO todavía no lo exponía (`ddbdae3` estaba en el checkout pero no
   * en producción). Ya se desplegó: el esquema de
   * `nucleo-erp.vercel.app/api/schema/` lo declara en `OrdenReflejanteList`/
   * `OrdenReflejanteRetrieve` y además lo lista como REQUERIDO. Se ajusta a
   * `string`, tal como preveía la nota anterior.
   */
  empresa_nombre: string;
  sucursal: number;
  /** Nombre legible de la sucursal (`source='sucursal.nombre'`). Misma garantía
   *  de no-nulidad que `empresa_nombre`, y ya desplegado igual que aquél. */
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
  detalles: ReflectiveOrderLine[];

  // ─── Cobertura sobre el pedido ─────────────────────────────────────────
  // Las declara `OrdenReflejanteListSerializer` y, por herencia,
  // `OrdenReflejanteRetrieveSerializer` — o sea que el listado Y el detalle
  // por id traen las tres con el mismo nombre. `ReflectiveOrderDetail` las
  // hereda de este tipo sin re-declararlas (ver más abajo), y por eso el
  // diálogo de detalle puede leerlas de SU PROPIA consulta por id, sin
  // recibirlas como prop desde la fila que lo abrió (que es justo lo que se
  // rompía al abrirlo desde el enlace del 409, con un id ausente del listado
  // cargado).
  //
  // El backend las resuelve para la página/orden ENTERA en queries agrupadas
  // (`OrdenReflejanteService.cobertura_por_orden`), así que no hay N+1 por
  // fila ni en el listado ni en el detalle.
  //
  // Los dos números llegan como ENTEROS aunque `cantidad` sea `FloatField`:
  // el service aplica `math.floor` (piso, nunca redondeo) sobre las sumas
  // para no sobre-reportar cobertura inexistente.

  /** ¿ESTA orden sola cubre el 100% de lo contratado por el pedido? */
  cobertura_completa: boolean;
  /**
   * Piezas que programa ESTA orden. El backend la acota con `min(...,
   * cantidad_contratada)`, así que nunca excede al denominador aunque el
   * pedido se haya editado después de crear la orden.
   */
  cantidad_cubierta: number;
  /**
   * Piezas de reflejante que contrató el pedido, sumando TODAS sus líneas con
   * `lleva_reflejante` — no solo las que toca esta orden. Puede ser `0`
   * (pedido sin líneas de reflejante vivas), y en ese caso
   * `cobertura_completa` llega `false`: quien calcule un porcentaje debe
   * protegerse de la división.
   */
  cantidad_contratada: number;
}

// ─── Detalle por id (`GET /produccion/orden-reflejante/{id}/`) ───────────────

/**
 * Renglón del DETALLE (`OrdenReflejanteDetalleRetrieveSerializer`). Es el del
 * listado MÁS el contexto de parcialidad de su línea y el `reflejante_config`
 * crudo del pedido.
 *
 * NO se declaran `ubicaciones`, `foto` ni `notas`, que el backend SÍ devuelve:
 * llegan vacíos (`[]`/`null`/`null`) en el 100% de los registros y por
 * construcción, no por falta de captura. La extracción que los resuelve está
 * copiada de bordado, donde `bordado_config` es un OBJETO; en reflejante el
 * config es un ARREGLO (ver `ReflectiveLineConfigEntry`), así que el backend lo
 * pasa por un guard (`_get_cfg_dict`) que devuelve `{}` y las tres claves salen
 * vacías siempre. Tiparlas invitaría a construir UI que jamás se pinta — mismo
 * criterio que `EmbroideryOrderDetailLine` con `foto`/`notas`.
 */
export interface ReflectiveOrderDetailLine extends ReflectiveOrderLine {
  /**
   * Piezas contratadas por el pedido en ESTA línea.
   *
   * Los tres son `null` solo si el backend no encuentra la línea NI por
   * `(pedido_detalle, talla)` NI por `pedido_detalle` — el serializer cae al
   * total del renglón cuando la talla no cruza, precisamente para que un
   * renglón sin talla no salga con los tres campos en blanco. Aun así se tipan
   * nullable: esa rama existe y devuelve `None` explícitamente.
   */
  cantidad_pedido: number | null;
  /** Piezas ya programadas en esta línea por TODAS las OR activas del pedido. */
  cantidad_asignada: number | null;
  /** Saldo de la línea: `cantidad_pedido - cantidad_asignada`. */
  cantidad_pendiente: number | null;
  /**
   * FOTO CONGELADA del `reflejante_config` al emitir la orden
   * (`OrdenReflejanteDetalle.configuracion`, migración `0027`). Es el ARREGLO
   * íntegro —no un objeto que lo envuelva, a diferencia de bordado— o `null` en
   * las órdenes anteriores a la migración (no se hizo backfill).
   *
   * Es la fuente PREFERIDA para pintar el documento: una orden refleja lo que se
   * mandó a producción cuando se emitió, no lo que la cotización diga después.
   * Ver `resolveReflectiveLineConfigs`, que cae a `reflejante_config` (lectura en
   * vivo) cuando esto es `null`. El listado NO lo trae
   * (`OrdenReflejanteDetalleListSerializer` lo excluye).
   */
  configuracion: ReflectiveLineConfigEntry[] | null;
  /**
   * LECTURA EN VIVO del `reflejante_config` de la `PedidoDetalleTalla` de esta
   * línea (`SerializerMethodField` que la re-lee por
   * `(pedido_detalle_id, talla_id)`), tal cual está HOY en el pedido y sin
   * normalizar. `null` cuando la talla no cruza o el config viene vacío.
   *
   * Es el RESPALDO de `configuracion` para las órdenes anteriores a la
   * migración, que no tienen foto congelada. `tipo_reflejante`/`posicion`
   * escalares solo describen el elemento `[0]`; el arreglo completo (con sus N
   * materiales y posiciones) vive aquí y en `configuracion`. Ver
   * `resolveReflectiveLineConfigs`.
   */
  reflejante_config: ReflectiveLineConfigEntry[] | null;
}

/**
 * UN elemento de `reflejante_config` (un reflejante concreto: material, opción y
 * posición). En los datos reales el campo es SIEMPRE un ARREGLO de estos
 * elementos —nunca un objeto, a diferencia de `bordado_config`—, y ese arreglo
 * trae de UNO A VARIOS: la distribución medida entre las tallas con
 * `lleva_reflejante` es `{1: 49, 2: 6, 3: 4}`. Los cuatro de tres son de
 * P-00027-2026, que mezcla DOS MATERIALES en la misma prenda (`ignifuga-plata-1`
 * en HOMBROS y BRAZOS, `costurable-plata-1` en TIRANTES).
 *
 * Es captura de una cotización, no un contrato de serializer: el backend lo
 * reenvía sin tocar, así que toda clave queda opcional/nullable y quien la
 * pinte debe comprobarla antes.
 *
 * OJO — hay DOS afirmaciones distintas que no deben confundirse:
 *  - Que el config sea UNIFORME entre las líneas de un mismo pedido (los mismos
 *    elementos en todas sus tallas) es CIERTO hoy y verificado.
 *  - Que por eso "no haya detalle por línea que mostrar" es FALSO: el config es
 *    un arreglo de hasta tres reflejantes con posiciones y materiales
 *    distintos, así que hay contenido real que enseñar; lo que no hay es
 *    VARIACIÓN entre líneas. El Paso 2 hoy solo captura cantidades y no lo
 *    muestra, pero es una decisión pendiente de UI, no una ausencia de dato
 *    (mismo criterio que las N ubicaciones de bordado). No lo colapses a
 *    `[0]`.
 */
export interface ReflectiveLineConfigEntry {
  tipo?: string | null;
  opcion?: string | null;
  posicion?: string | null;
}

/** Otra OR activa del mismo pedido, tal cual la lista el detalle. */
export interface ReflectiveOrderSibling {
  id: number;
  folio_reflejante: string;
  fecha_inicio: string;
}

/**
 * Respuesta de `GET /produccion/orden-reflejante/{id}/`.
 *
 * Es un superconjunto ESTRICTO del listado: `OrdenReflejanteRetrieveSerializer`
 * hereda de `OrdenReflejanteListSerializer`, así que trae el mismo encabezado
 * —cobertura incluida, heredada aquí de `ReflectiveOrder` sin re-declararla—,
 * más los dos campos propios de abajo y un `detalles` más rico por renglón.
 *
 * Aun siendo superconjunto, el diálogo de detalle NO se arma con la fila del
 * listado: la fila carece de la parcialidad por línea, del `reflejante_config`
 * y de las órdenes hermanas, y además puede no existir (el enlace del 409 abre
 * por un id que quizá no está en la lista cargada).
 */
export interface ReflectiveOrderDetail extends Omit<ReflectiveOrder, "detalles"> {
  detalles: ReflectiveOrderDetailLine[];
  /** Las demás OR activas del mismo pedido. Vacío si esta es la única. */
  otras_ordenes_del_pedido: ReflectiveOrderSibling[];
  /**
   * `{id, folio}` del pedido madre. Es propio del DETALLE
   * (`OrdenReflejanteRetrieveSerializer`; el listado no lo declara), y lo arma
   * el MISMO helper compartido que ya usa bordado
   * (`armar_pedido_vinculado`), así que la forma es idéntica en los dos módulos.
   *
   * Duplica el par plano `pedido`/`pedido_folio` que ya viaja en el encabezado,
   * y es a propósito: el backend lo agrupa así para poder añadirle claves
   * —cliente, fecha— sin inventar campos planos nuevos. Se prefiere este objeto
   * para NAVEGAR al pedido, porque su presencia es la única señal de que el
   * pedido madre existe; el par plano se queda para rotular.
   *
   * `null` cuando la orden no tiene pedido. `folio` nunca es `null` aunque
   * `Pedido.folio` sí lo sea: el helper cae al PK en string.
   *
   * El esquema OpenAPI DESPLEGADO lo declara como `string` porque
   * drf-spectacular no infiere el tipo de retorno de un
   * `SerializerMethodField`; el tipo real es el de este objeto (verificado en
   * `armar_pedido_vinculado`), mismo caso ya documentado en `usuario_nombre`.
   */
  pedido_vinculado: { id: number; folio: string } | null;
  /**
   * `true` cuando el pedido tiene piezas programadas SIN talla identificable
   * (renglones con `talla` nula que genera el pipeline de picking, más los
   * renglones históricos de reflejante). El total por `pedido_detalle` sigue
   * siendo exacto; lo que no puede afirmarse es a qué talla concreta
   * corresponde cada pieza.
   */
  reparto_por_talla_aproximado: boolean;
}

// ─── Onboarding / alta ───────────────────────────────────────────────────────

/**
 * Renglón POR TALLA del pedido candidato — el "estado de la verdad" de lo que
 * aún se puede programar a reflejante.
 *
 * `cantidad_asignada` es lo ya programado por las OR activas del pedido y
 * `cantidad_pendiente = cantidad_pedido - cantidad_asignada` (acotado a 0). El
 * backend devuelve TODAS las líneas elegibles del pedido, incluidas las que ya
 * no tienen pendiente (`cantidad_pendiente === 0`), para que la UI pueda
 * mostrarlas agotadas en vez de ocultarlas — mismo criterio que
 * `EmbroideryOnboardingDetalle`.
 *
 * Las tres cantidades son NÚMEROS en el JSON (`float`), no el string decimal
 * habitual de inventario: `PedidoDetalleTalla.cantidad` es un
 * `PositiveIntegerField` y las prendas se reflejan enteras.
 *
 * `color_id`/`color_nombre` cuelgan del `PedidoDetalle` (no de la talla) y son
 * nullable, igual que `talla_id`/`talla_nombre` y `producto_nombre`.
 *
 * Bordado, reflejante y corte de manga comparten el MISMO constructor de este
 * payload en el backend (`_payload_pedidos_onboarding`). NO se declaran aquí las
 * claves que ese constructor deriva del `*_config` con forma de objeto
 * —`posicion_sugerida`, `ubicaciones`, `foto`, `notas`—: para reflejante salen
 * siempre vacías porque el config es un ARREGLO, no un objeto (ver
 * `ReflectiveLineConfigEntry`). El arreglo crudo SÍ viaja: el onboarding de
 * reflejante activa `incluir_config_crudo=True`, así que cada línea trae
 * `reflejante_config` (los reflejantes reales del pedido, hasta tres, con dos
 * materiales en P-00027). Hoy el Paso 2 solo captura cantidades y no lo pinta,
 * pero se declara para no descartar en silencio dato que el backend envía —
 * mostrarlo es trabajo de UI pendiente, no una ausencia de dato.
 */
export interface ReflectiveOnboardingDetalle {
  /** Id de `PedidoDetalleTalla` — el que viaja en `detalles_override`. */
  pedido_detalle_talla_id: number;
  pedido_detalle_id: number;
  producto_id: number;
  producto_nombre: string | null;
  talla_id: number | null;
  talla_nombre: string | null;
  color_id: number | null;
  color_nombre: string | null;
  cantidad_pedido: number;
  cantidad_asignada: number;
  cantidad_pendiente: number;
  /**
   * Los reflejantes del pedido para esta línea, tal cual los guardó ventas
   * (`incluir_config_crudo=True` en el backend). `null` cuando el config viene
   * vacío. Es el MISMO shape que `ReflectiveOrderDetailLine.reflejante_config`
   * del `retrieve`; hoy no se pinta en el Paso 2 (ver
   * `ReflectiveLineConfigEntry`).
   */
  reflejante_config: ReflectiveLineConfigEntry[] | null;
}

/**
 * Pedido candidato del catálogo (`GET /produccion/orden-reflejante/onboarding/`).
 *
 * El backend arma este objeto a mano en la vista (no vía serializer): son
 * pedidos activos, de la empresa del usuario y de sus `sucursales_permitidas`,
 * con AL MENOS una talla marcada `lleva_reflejante=True` y `cantidad > 0`,
 * ordenados `-created_at, -id`.
 *
 * El catálogo se acota por SALDO, no por existencia de OR: un pedido que ya
 * tiene órdenes de reflejante sigue apareciendo mientras alguna de sus líneas
 * conserve `cantidad_pendiente > 0`, y desaparece por completo cuando todas
 * quedan en 0. Este archivo afirmaba lo contrario —"el catálogo NO excluye los
 * pedidos que ya tienen una orden de reflejante activa"—: era cierto antes de
 * que el backend unificara los tres onboardings de órdenes de trabajo en
 * `_payload_pedidos_onboarding`, que descarta el pedido sin ninguna línea con
 * saldo. Y con ello el 409 de duplicado dejó de ser alcanzable por esta vía:
 * solo se evalúa en el POST SIN `detalles_override`, que el asistente ya no
 * emite (ver `CreateReflectiveOrderPayload`).
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
  /**
   * Detalle por talla del pedido. El frontend lo IGNORABA —esta interfaz ni
   * siquiera lo declaraba—, así que descartaba dato que el backend ya
   * devolvía; es lo que alimenta el Paso 2 del asistente.
   */
  detalles: ReflectiveOnboardingDetalle[];
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
 * Renglón de `detalles_override` — la línea del pedido que SÍ entra en esta
 * orden, y con cuántas piezas.
 *
 * `pedido_detalle_talla_id` es el `pedido_detalle_talla_id` de
 * `ReflectiveOnboardingDetalle` (o sea, `PedidoDetalleTalla.id`), NO el
 * `pedido_detalle_id`.
 *
 * `cantidad` es un ENTERO de piezas: el serializer rechaza con `400` cualquier
 * fraccionario (`` `cantidad` debe ser un número entero de piezas ``) porque
 * `PedidoDetalleTalla.cantidad` es un `PositiveIntegerField` y los residuos de
 * coma flotante dejaban pendientes de 1e-15 que ninguna OR podía consumir.
 * Viaja como número, no como string decimal.
 *
 * El backend rechaza además: ids repetidos, ids ajenos al `pedido` del body,
 * ids sin `lleva_reflejante`, `cantidad <= 0` y `cantidad` mayor a la
 * contratada en el pedido — todos como `400` bajo la clave `detalles_override`.
 */
export interface ReflectiveOrderDetalleOverride {
  pedido_detalle_talla_id: number;
  cantidad: number;
}

/**
 * Cuerpo de `POST /produccion/orden-reflejante/onboarding/`.
 *
 * El backend deriva `empresa`/`sucursal` del pedido, `usuario_asignado` del
 * usuario autenticado y `folio_reflejante` de la serie de folios;
 * `activo`/`fecha_inicio` toman su default.
 *
 * `estatus_reflejante` y `fecha_fin` SÍ son escribibles en el serializer (a
 * diferencia de bordado, que declara `estatus_bordado` como `read_only`), pero
 * `OrdenReflejanteService.save` construye la orden campo por campo y no los
 * lee: se aceptan y se descartan en silencio. Quedan fuera de este tipo por eso
 * mismo — un campo de formulario para ellos prometería una decisión que el
 * backend ignora.
 *
 * `detalles_override` es OPCIONAL y estrictamente aditivo:
 *  - AUSENTE (o vacío) → comportamiento histórico: el service deriva los
 *    renglones solo, uno por cada `PedidoDetalleTalla` con
 *    `lleva_reflejante=True` del pedido, al 100% de su cantidad. Sobre un
 *    pedido ya cubierto al 100% responde `409`.
 *  - PRESENTE → la orden incluye SOLO esas líneas, con esas cantidades. Un
 *    mismo pedido puede acumular varias OR parciales hasta cubrirse (la
 *    constraint `uq_orden_reflejante_activa_por_pedido` se quitó en la
 *    migración `0025`), y por eso esta ruta NO emite el `409` de duplicado: si
 *    algo excede el saldo, responde `400` con `detalles_exceso`.
 *
 * `detalles` (los renglones ya creados) sigue sin enviarse nunca: es la
 * respuesta, no el cuerpo.
 */
export interface CreateReflectiveOrderPayload {
  pedido: number;
  prioridad?: number;
  observaciones?: string;
  detalles_override?: ReflectiveOrderDetalleOverride[];
}

/**
 * Respuesta del POST de alta.
 *
 * NO es un `ReflectiveOrder`: el `ViewSet` serializa la orden recién creada con
 * `OrdenReflejanteSerializer` (el BASE), no con el del listado, así que el
 * cuerpo llega SIN los tres campos de cobertura. Tiparla como la fila del
 * listado prometería un `cobertura_completa: boolean` que en tiempo de
 * ejecución es `undefined`.
 *
 * Quien necesite la cobertura de la orden nueva la obtiene del listado que la
 * mutación invalida, o del detalle por id — no de aquí. Hoy el único consumidor
 * es el toast de éxito, que solo lee `folio_reflejante`.
 */
export type CreatedReflectiveOrder = Omit<
  ReflectiveOrder,
  "cobertura_completa" | "cantidad_cubierta" | "cantidad_contratada"
>;
