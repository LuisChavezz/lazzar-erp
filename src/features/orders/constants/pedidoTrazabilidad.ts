import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type {
  TrazabilidadEstado,
  TrazabilidadOrdenTipo,
  TrazabilidadPaso,
  TrazabilidadPasoClave,
  TrazabilidadSemaforo,
} from "../interfaces/pedido-trazabilidad.interface";

/**
 * Estado de un paso o proceso de la trazabilidad. `Record` sobre la unión
 * COMPLETA: un valor nuevo del backend sin entrada aquí no compila.
 */
const TRAZABILIDAD_ESTADO_CONFIG: Record<TrazabilidadEstado, StatusBadgeConfigEntry> = {
  no_aplica: {
    label: "No aplica",
    cls: "bg-slate-50 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-300 dark:bg-slate-500",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  en_proceso: {
    label: "En proceso",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  completo: {
    label: "Completo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  // Mismo tono que "Detenido" de la orden de bordado (`EMBROIDERY_STATUS_CONFIG`).
  detenido: {
    label: "Detenido",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

/**
 * Semáforo del pedido, tal como lo decide el backend. `gris` no es "sin
 * datos": el pedido no se puede evaluar (cancelado, sin clasificación o sin
 * fecha compromiso), y el motivo llega en `resumen.motivos`.
 */
const TRAZABILIDAD_SEMAFORO_CONFIG: Record<TrazabilidadSemaforo, StatusBadgeConfigEntry> = {
  verde: {
    label: "A tiempo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  amarillo: {
    label: "En riesgo",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  rojo: {
    label: "Atrasado",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
  terminado: {
    label: "Terminado",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  gris: {
    label: "Sin evaluar",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

/**
 * Respaldo NEUTRO para un valor que el backend mande y esta UI no conozca
 * todavía. Sin `label`: `StatusBadge` muestra entonces el valor crudo.
 */
const TRAZABILIDAD_NEUTRAL_CONFIG: StatusBadgeConfigEntry = {
  cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  dot: "bg-slate-400",
};

/*
 * Todas las búsquedas por un valor que llega del backend pasan por estos
 * getters: el `Record` sobre la unión completa solo protege en compilación, y un
 * valor nuevo del backend no puede tumbar el detalle del pedido. `Object.hasOwn`
 * (no indexado directo) para que un valor como `constructor` no resuelva a algo
 * heredado de `Object.prototype`.
 */

export const getTrazabilidadEstadoConfig = (estado: string): StatusBadgeConfigEntry =>
  Object.hasOwn(TRAZABILIDAD_ESTADO_CONFIG, estado)
    ? TRAZABILIDAD_ESTADO_CONFIG[estado as TrazabilidadEstado]
    : TRAZABILIDAD_NEUTRAL_CONFIG;

export const getTrazabilidadSemaforoConfig = (semaforo: string): StatusBadgeConfigEntry =>
  Object.hasOwn(TRAZABILIDAD_SEMAFORO_CONFIG, semaforo)
    ? TRAZABILIDAD_SEMAFORO_CONFIG[semaforo as TrazabilidadSemaforo]
    : TRAZABILIDAD_NEUTRAL_CONFIG;

/**
 * Etiquetas propias de la UI que sustituyen el `label` del backend. Solo
 * `surtido`: el backend lo mide con lo ASIGNADO en picking (el mismo dato que la
 * barra "Avance asignado" de esta hoja), no con lo surtido, y en la misma
 * pantalla convive con "Avance surtido", que sí lo es.
 */
const PASO_LABEL_OVERRIDES: Partial<Record<TrazabilidadPasoClave, string>> = {
  surtido: "Asignado",
};

/** Etiqueta visible de un paso: la de la UI si existe, si no la del backend. */
export const getTrazabilidadPasoLabel = (paso: Pick<TrazabilidadPaso, "clave" | "label">): string =>
  (Object.hasOwn(PASO_LABEL_OVERRIDES, paso.clave) && PASO_LABEL_OVERRIDES[paso.clave]) ||
  paso.label;

/**
 * Llaves de `ORDER_DOCUMENT_DIALOGS` (el `doc.tipo` de `documentos[]`) de las
 * órdenes de trabajo. El vocabulario de `ordenes[].tipo` de la trazabilidad es
 * otro (`BORDADO`, `OP`…), así que se traduce aquí para abrir el MISMO diálogo
 * que "Documentos relacionados".
 */
export type OrdenTrabajoDocTipo =
  | "orden_bordado"
  | "orden_reflejante"
  | "orden_corte_manga"
  | "orden_produccion";

const TRAZABILIDAD_ORDEN_DOC_TIPO: Record<TrazabilidadOrdenTipo, OrdenTrabajoDocTipo> = {
  BORDADO: "orden_bordado",
  REFLEJANTE: "orden_reflejante",
  CORTE_MANGA: "orden_corte_manga",
  OP: "orden_produccion",
};

/** Llave de diálogo de `tipo`, o `null` si es un tipo que esta UI no conoce. */
export const getOrdenDocTipo = (tipo: string): OrdenTrabajoDocTipo | null =>
  Object.hasOwn(TRAZABILIDAD_ORDEN_DOC_TIPO, tipo)
    ? TRAZABILIDAD_ORDEN_DOC_TIPO[tipo as TrazabilidadOrdenTipo]
    : null;
