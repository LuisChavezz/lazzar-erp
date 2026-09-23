/**
 * Mapas de presentación para los enteros crudos `estatus` y `tipo_pedido` del
 * pedido — el serializer NO trae etiquetas, solo el número. Se construyen
 * completos contra el enum del backend (`Pedido.CHOICES_ESTATUS` /
 * `TIPO_PEDIDO_CHOICES`), no solo contra los valores presentes hoy en datos.
 *
 * Cada entrada trae `label` (es-MX) y `className` con las utilidades de badge
 * ya usadas en el resto del ERP (par claro/oscuro). `getPedidoEstatusConfig` /
 * `getTipoPedidoConfig` caen a un badge neutro "Desconocido (n)" para valores
 * fuera de rango, en vez de romper el render.
 */

export interface BadgeConfig {
  label: string;
  className: string;
}

export const PEDIDO_ESTATUS = {
  BORRADOR: 1,
  POR_AUTORIZAR: 2,
  AUTORIZADA: 3,
  EN_PROCESO: 4,
  CANCELADO: 5,
} as const;

export const PEDIDO_ESTATUS_CONFIG: Record<number, BadgeConfig> = {
  [PEDIDO_ESTATUS.BORRADOR]: {
    label: "Borrador",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  },
  [PEDIDO_ESTATUS.POR_AUTORIZAR]: {
    label: "Por autorizar",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  [PEDIDO_ESTATUS.AUTORIZADA]: {
    label: "Autorizada",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  [PEDIDO_ESTATUS.EN_PROCESO]: {
    label: "En proceso",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  [PEDIDO_ESTATUS.CANCELADO]: {
    label: "Cancelado",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
};

export const TIPO_PEDIDO = {
  PEDIDO_DE_VENTA: 1,
  MUESTRA: 2,
  PEDIDO_DE_ERROR: 3,
} as const;

export const TIPO_PEDIDO_CONFIG: Record<number, BadgeConfig> = {
  [TIPO_PEDIDO.PEDIDO_DE_VENTA]: {
    label: "Pedido de venta",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  [TIPO_PEDIDO.MUESTRA]: {
    label: "Muestra",
    className:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  [TIPO_PEDIDO.PEDIDO_DE_ERROR]: {
    label: "Pedido de error",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
};

const NEUTRAL_BADGE = "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300";

/**
 * Badge de ORIGEN (Recompra, Chat online, Amazon…): gris/neutro, para leerse
 * como una categoría distinta de los badges de estatus/tipo, que van con color.
 * Lo comparten el detalle del pedido y el de la cotización (`RecompraBadge`).
 */
export const ORIGIN_BADGE_CLASS = NEUTRAL_BADGE;

export const getPedidoEstatusConfig = (estatus: number): BadgeConfig =>
  PEDIDO_ESTATUS_CONFIG[estatus] ?? {
    label: `Desconocido (${estatus})`,
    className: NEUTRAL_BADGE,
  };

export const getTipoPedidoConfig = (tipo: number): BadgeConfig =>
  TIPO_PEDIDO_CONFIG[tipo] ?? {
    label: `Desconocido (${tipo})`,
    className: NEUTRAL_BADGE,
  };

/**
 * `Pedido.clasificacion`: `CharField(max_length=1)` nullable. El backend lo
 * devuelve como código crudo y NO expone `get_clasificacion_display`, así que la
 * etiqueta vive aquí. Mapa hermano de los de arriba, con llaves de TEXTO en vez
 * de numéricas.
 */
export const PEDIDO_CLASIFICACIONES = ["A", "B", "C", "D", "E", "F", "X"] as const;

export type PedidoClasificacion = (typeof PEDIDO_CLASIFICACIONES)[number];

export const PEDIDO_CLASIFICACION_CONFIG: Record<PedidoClasificacion, { label: string }> = {
  A: { label: "A - 2 a 5 días" },
  B: { label: "B - 5 a 8 días" },
  C: { label: "C - 5 a 15 días" },
  D: { label: "D - 4 a 6 semanas" },
  E: { label: "E - 6 a 8 semanas" },
  F: { label: "F - 8 a 10 semanas" },
  X: { label: "X - Solo para facturar" },
};

export const isPedidoClasificacion = (value: unknown): value is PedidoClasificacion =>
  typeof value === "string" && Object.hasOwn(PEDIDO_CLASIFICACION_CONFIG, value);

export const getPedidoClasificacionLabel = (clasificacion: string | null | undefined): string => {
  if (clasificacion == null || clasificacion === "") return "Sin clasificación";
  return isPedidoClasificacion(clasificacion)
    ? PEDIDO_CLASIFICACION_CONFIG[clasificacion].label
    : `Desconocida (${clasificacion})`;
};

/**
 * ¿Se puede editar este pedido desde Mesa de Control?
 *
 * Regla construida contra el enum COMPLETO (`Pedido.CHOICES_ESTATUS`), no solo
 * contra los valores que hay en datos hoy:
 *
 * | # | Estatus       | ¿Editable? | Por qué                                    |
 * |---|---------------|------------|--------------------------------------------|
 * | 1 | BORRADOR      | Sí         | Nada cuelga todavía del pedido.            |
 * | 2 | POR AUTORIZAR | Sí         | Ídem.                                       |
 * | 3 | AUTORIZADA    | Sí         | Estado con el que NACE el pedido            |
 * |   |               |            | (`views.py:1468`) — el caso normal.        |
 * | 4 | EN PROCESO    | Sí         | Es justamente para lo que existe la         |
 * |   |               |            | pantalla: corregir un pedido ya en marcha.  |
 * |   |               |            | Lo que cuelga de él se advierte en el       |
 * |   |               |            | diálogo de confirmación, no se prohíbe.     |
 * | 5 | CANCELADO     | **No**     | Guardar borraría y recrearía el detalle de  |
 * |   |               |            | un pedido muerto, arrastrando por CASCADE   |
 * |   |               |            | los renglones de picking, factura y         |
 * |   |               |            | producción. No hay nada que corregir.       |
 *
 * Un estatus FUERA del enum (dato corrupto o valor nuevo del backend) se trata
 * como NO editable: ante un valor que este frontend no sabe interpretar, la
 * opción segura frente a un guardado destructivo es no dejar entrar.
 */
export const canEditPedidoMesaControl = (estatus: number | null | undefined): boolean =>
  estatus != null &&
  estatus !== PEDIDO_ESTATUS.CANCELADO &&
  Object.hasOwn(PEDIDO_ESTATUS_CONFIG, estatus);

/**
 * ¿El pedido está en un estatus FINAL? Hoy solo CANCELADO: es el único que el
 * enum (`Pedido.CHOICES_ESTATUS`) trata como cierre; EN PROCESO sigue vivo y no
 * hay un "Entregado"/"Cerrado". Gobierna la edición en línea de la cabecera del
 * detalle (clasificación, fecha de confirmación).
 *
 * Distinta de `canEditPedidoMesaControl` a propósito: aquélla protege un
 * guardado DESTRUCTIVO y por eso también cierra el paso a estatus fuera del
 * enum; ésta solo responde "¿ya terminó?", y un valor desconocido no lo es.
 */
export const isPedidoTerminal = (estatus: number | null | undefined): boolean =>
  estatus === PEDIDO_ESTATUS.CANCELADO;

const RECOMPRABLE_PEDIDO_ESTATUSES = new Set<number>([
  PEDIDO_ESTATUS.AUTORIZADA,
  PEDIDO_ESTATUS.EN_PROCESO,
]);

/**
 * ¿Se ofrece "Recompra" (clonar el pedido en una cotización nueva) para este
 * pedido? Solo AUTORIZADA o EN PROCESO: son los pedidos que ya se vendieron de
 * verdad. Es una decisión de PRODUCTO, más estricta que el backend
 * (`POST /ventas/pedidos/{id}/recomprar/` acepta cualquier estatus).
 */
export const canRecomprarPedido = (estatus: number | null | undefined): boolean =>
  estatus != null && RECOMPRABLE_PEDIDO_ESTATUSES.has(estatus);
