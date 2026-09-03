/**
 * Contrato de ESCRITURA de la edición de pedidos por Mesa de Control
 * (`POST /ventas/pedidos/{id}/editar-mesa-control/`).
 *
 * El endpoint es "document-shaped" igual que el onboarding de cotizaciones:
 * recibe `{ pedido, detalle, servicios_extras }` en una sola llamada atómica,
 * guarda el pedido y ESPEJA el cambio a su cotización de origen (que vuelve a
 * `estatus = 3` y regraba su `aprobado_snapshot`).
 *
 * DOS propiedades del backend condicionan todo lo que hay aquí:
 *
 *   1. `detalle` es DESTRUCTIVO: `_save_pedido_detalle` hace
 *      `PedidoDetalle.objects.filter(pedido=...).delete()` antes de recrear. El
 *      arreglo viaja SIEMPRE COMPLETO, y todo lo que no se mande se pierde
 *      (incluidos los registros que cuelgan del renglón por CASCADE: picking,
 *      factura, reservas de inventario, órdenes de producción, entregas y
 *      devoluciones).
 *   2. Los importes NO se derivan en el servidor: se guardan verbatim tal como
 *      los calcula el cliente, igual que en cotizaciones.
 */
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import type { PedidoDetail } from "./order.interface";

/**
 * Configuraciones congeladas de servicios por talla.
 *
 * Se REUSAN los tipos de `QuoteById` en vez de redeclararlos: es el mismo JSON,
 * escrito por el mismo formulario y leído por los mismos módulos de Producción.
 * El tipo de LECTURA del pedido (`ServicioConfig` en `order.interface.ts`) sigue
 * siendo laxo a propósito —describe un `JSONField` sin forma garantizada—, así
 * que la hidratación estrecha de aquel a estos con guardas explícitas.
 *
 * OJO con la asimetría, que ya costó tres 500 en OR/OCM: `reflejante_config` es
 * un ARRAY y `bordado_config`/`corte_manga_config` son OBJETO.
 */
type QuoteTalla = QuoteById["detalles"][number]["tallas"][number];
export type PedidoBordadoConfig = QuoteTalla["bordado_config"];
export type PedidoReflejanteConfig = QuoteTalla["reflejante_config"];
export type PedidoCorteMangaConfig = QuoteTalla["corte_manga_config"];

/**
 * Talla de un renglón. `cantidad` tiene `min_value=1` en
 * `PedidoOnboardingTallaInputSerializer`, así que las tallas en cero se filtran
 * ANTES de armar el payload — mandarlas devuelve 400.
 */
export interface PedidoMesaControlTallaInput {
  talla: number;
  cantidad: number;
  lleva_bordado: boolean;
  /**
   * `Record<string, unknown>` y no `PedidoBordadoConfig`: el objeto que viaja es
   * el JSON GUARDADO con las claves del formulario fusionadas encima, no una
   * reconstrucción. Conserva por tanto las claves que escriben los módulos de
   * Producción (`foto`/`imagen`, `posicion`, `observaciones`, y `nombre` dentro
   * de cada ubicación) y que este formulario no modela. `PedidoBordadoConfig`
   * sigue describiendo el subconjunto que el formulario SÍ posee.
   */
  bordado_config: Record<string, unknown>;
  lleva_reflejante: boolean;
  /** Array; misma fusión por entrada que `bordado_config.ubicaciones`. */
  reflejante_config: Record<string, unknown>[];
  lleva_corte_manga: boolean;
  /**
   * `unknown` y no `PedidoCorteMangaConfig`: el formulario NO captura este JSON
   * —solo la bandera— y lo reenvía verbatim tal como lo leyó, así que su forma
   * es la que haya escrito el módulo de Corte de Manga, no la que este
   * formulario sabría construir. Solo cuando la línea no trae ninguna se manda
   * el `{ tipo: "1" }` de arranque.
   */
  corte_manga_config: unknown;
  /**
   * Cambio de talla: `_save_pedido_detalle` RECREA estas dos columnas desde el
   * payload (a `false`/`null` si no viajan), así que hay que reenviarlas aunque
   * el formulario no las exponga. El backend rechaza con 400 una talla con
   * `lleva_cambio_talla=true` y config vacía.
   */
  lleva_cambio_talla: boolean;
  cambio_talla_config: unknown;
}

/**
 * Renglón del detalle. `producto` va en `null` y el nombre libre en
 * `producto_nombre_externo` cuando es una línea de MUESTRA.
 *
 * `color` (no `color_id`): el serializer declara los dos y `_merge_detalle`
 * normaliza el alias, pero el nombre canónico —el que acaba en el modelo— es
 * `color`, así que es el que se manda.
 *
 * `precio_lista` es la diferencia real con el alta de cotización: ESTE endpoint
 * lo respeta. Se manda explícito con el valor leído del pedido; en un renglón
 * nuevo (que no tiene precio de lista propio) va `null` y el backend lo resuelve
 * desde `producto.precio_base`, que es justamente el precio de lista del
 * catálogo.
 */
export interface PedidoMesaControlDetalleInput {
  producto: number | null;
  producto_nombre_externo?: string;
  precio_lista: string | null;
  precio_unitario: string;
  color: number | null;
  /** Passthrough opaco — ver `PedidoDetalleLinea.direccion_envio_cliente`. */
  direccion_envio_cliente: number | null;
  tallas: PedidoMesaControlTallaInput[];
}

/**
 * Servicio extra. `nombre` es `CharField(max_length=150)` REQUERIDO y `cantidad`
 * tiene `min_value=1`, así que los servicios sin nombre se filtran antes de
 * enviar. `visible_en_factura` se conserva del valor leído (default `true` en un
 * servicio nuevo).
 */
export interface PedidoMesaControlServicioExtraInput {
  nombre: string;
  monto: string;
  cantidad: number;
  visible_en_factura: boolean;
}

/**
 * Cabecera editable del pedido.
 *
 * SOLO campos escribibles: `PedidoMesaControlHeaderSerializer` EXCLUYE
 * `empresa`, `serie_folio`, `folio`, `folio_consecutivo`, `cotizacion`,
 * `estatus`, `activo`, `created_at`, `updated_at` y `fecha_confirmacion`. No se
 * mandan —aunque el serializer los ignoraría sin quejarse— porque incluirlos
 * sugiere que el cliente los controla, y no lo hace.
 *
 * Tampoco viajan las banderas de origen (`recompra`, `chat_online`, …),
 * `empaque_ecologico` ni `cliente_giro_empresarial`: el formulario no las
 * captura y el serializer omite del `validated_data` todo campo ausente, así que
 * la vista NO los toca (`setattr` solo de lo recibido) y conservan su valor.
 * Declararlos aquí sin capturarlos los pondría en su default y los borraría.
 *
 * `sucursal`, `cliente` y `moneda` son obligatorios (FKs sin default).
 */
export interface PedidoMesaControlHeaderInput {
  sucursal: number;
  /**
   * NO nullable, a diferencia del payload de cotización: `Pedido.cliente` es un
   * FK obligatorio (`on_delete=CASCADE`, sin `null=True`), así que un `null`
   * aquí devuelve un 400 sobre un campo que el formulario ni siquiera pinta. El
   * hook lo exige antes de enviar.
   */
  cliente: number;
  moneda: number;
  persona_pagos: string;
  correo_facturas: string;
  telefono_pagos: string;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  tipo_pedido: number;
  oc: string;
  // ── Condiciones de pago ───────────────────────────────────────────────────
  anticipo_total: boolean;
  anticipo_parcial: boolean;
  vendedor_autoriza: boolean;
  pago_antes_embarque: boolean;
  por_confirmar: boolean;
  otra_cantidad: boolean;
  monto: string;
  // ── Snapshot fiscal del cliente ───────────────────────────────────────────
  cliente_razon_social: string;
  cliente_nombre: string;
  cliente_rfc: string;
  /**
   * PK de `SatRegimenFiscal` (`id_sat_regimen_fiscal`), NO el código SAT.
   *
   * OPCIONAL a propósito: el catálogo del formulario habla en CÓDIGOS ("601",
   * "626") y este campo espera la LLAVE PRIMARIA. Cuando la traducción no se
   * puede hacer, la clave se OMITE del payload en vez de mandarse en `null`:
   * omitir preserva el valor guardado (la vista solo hace `setattr` de las
   * claves recibidas), mientras que `null` lo borraría — el campo admite nulo.
   * Ver `usePedidoMesaControlEditForm`.
   */
  cliente_regimen_fiscal?: number;
  cliente_direccion_fiscal: string;
  cliente_colonia: string;
  cliente_codigo_postal: string;
  cliente_ciudad: string;
  cliente_estado: string;
  // ── Envío ─────────────────────────────────────────────────────────────────
  destinatario: string;
  empresa_envio: string;
  telefono_envio: string;
  celular_envio: string;
  direccion_envio: string;
  colonia_envio: string;
  codigo_postal: string;
  ciudad_envio: string;
  estado_envio: string;
  referencias: string;
  embarque_parcial: boolean;
  comentarios_parcialidad: string;
  observaciones: string;
  // ── Servicios e importes (strings con 2 decimales) ────────────────────────
  envio: string;
  programa_bordados: string;
  bordado_pantalones_extras: string;
  serigrafia: string;
  reflejante: string;
  bordado_logotipo: boolean;
  flete: string;
  seguros: string;
  anticipo: string;
  subtotal: string;
  descuento_global: string;
  ieps: string;
  /** Porcentaje ENTERO (p. ej. 16), no un importe. */
  iva: number;
  gran_total: string;
}

/** Cuerpo completo del POST. */
export interface PedidoMesaControlUpdate {
  pedido: PedidoMesaControlHeaderInput;
  detalle: PedidoMesaControlDetalleInput[];
  servicios_extras: PedidoMesaControlServicioExtraInput[];
}

/**
 * Respuesta del endpoint. Devuelve el pedido reserializado (filtrado por rol
 * contable) y la cotización espejada.
 *
 * `cotizacion` se tipa con la CABECERA de `QuoteById` (sin `detalles`): el
 * backend responde con `CotizacionSerializer`, que es el serializer plano del
 * modelo y NO anida renglones. Nada en el frontend consume hoy este cuerpo —la
 * mutación invalida y vuelve a leer—, así que se tipa para documentar el
 * contrato, no para explotarlo.
 */
export interface PedidoMesaControlUpdateResponse {
  pedido: PedidoDetail;
  cotizacion: Omit<QuoteById, "detalles" | "servicios_extras">;
  sincronizado: boolean;
}
