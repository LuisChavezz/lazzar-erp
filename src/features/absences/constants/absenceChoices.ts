import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogos de `tipo` y `estado` del permiso/ausencia. Son los enums COMPLETOS
 * del backend (`PermisoAusencia.TIPO_CHOICES` / `ESTADO_CHOICES`); no hay
 * endpoint de choices.
 *
 * El formulario NUNCA envía `estado`: el alta nace "pendiente" y las
 * transiciones solo ocurren por `aprobar/` y `rechazar/` (el PATCH lo acepta
 * por un defecto conocido del backend).
 */

export const TIPO_AUSENCIA_VALUES = ["permiso", "incapacidad", "falta_injustificada"] as const;

export type TipoAusencia = (typeof TIPO_AUSENCIA_VALUES)[number];

export const TIPO_FALTA_INJUSTIFICADA: TipoAusencia = "falta_injustificada";

export const TIPO_AUSENCIA_OPTIONS: { value: TipoAusencia; label: string }[] = [
  { value: "permiso", label: "Permiso" },
  { value: "incapacidad", label: "Incapacidad" },
  { value: "falta_injustificada", label: "Falta injustificada" },
];

export const getTipoAusenciaLabel = (value: string | null | undefined) =>
  TIPO_AUSENCIA_OPTIONS.find((option) => option.value === value)?.label ?? null;

/**
 * Sugerencia de `con_goce_sueldo` por tipo (D1):
 *
 * - permiso → con goce, editable.
 * - incapacidad → sin goce, editable.
 * - falta injustificada → sin goce FORZADO, no editable.
 */
export const GOCE_SUGERIDO: Record<TipoAusencia, boolean> = {
  permiso: true,
  incapacidad: false,
  falta_injustificada: false,
};

/** Tipos cuyo `con_goce_sueldo` no se puede elegir: siempre viaja `false`. */
export const isGoceForzado = (tipo: string) => tipo === TIPO_FALTA_INJUSTIFICADA;

export const ESTADO_AUSENCIA_VALUES = ["pendiente", "aprobado", "rechazado"] as const;

export type EstadoAusencia = (typeof ESTADO_AUSENCIA_VALUES)[number];

export const ESTADO_PENDIENTE: EstadoAusencia = "pendiente";
export const ESTADO_APROBADO: EstadoAusencia = "aprobado";
export const ESTADO_RECHAZADO: EstadoAusencia = "rechazado";

/**
 * Estados que OCUPAN el calendario del empleado (D3): un periodo nuevo no
 * puede traslaparse con ellos. Una rechazada/descartada ya no cuenta.
 */
export const ESTADOS_QUE_OCUPAN: readonly EstadoAusencia[] = [ESTADO_PENDIENTE, ESTADO_APROBADO];

/**
 * Filtro por estado del listado. Mezcla tipos, así que cada etiqueta nombra
 * también la variante de la falta injustificada (D2).
 */
export const ESTADO_AUSENCIA_FILTER_OPTIONS: { value: EstadoAusencia; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aprobado", label: "Aprobado / falta confirmada" },
  { value: "rechazado", label: "Rechazado / descartado" },
];

/**
 * Vocabulario del ciclo de vida por tipo (D2). La falta injustificada tiene el
 * MISMO ciclo (pendiente → aprobado/rechazado) pero se lee como "Confirmar
 * falta" / "Descartar": no se "aprueba" una falta.
 */
export interface AusenciaVocabulary {
  /** Botón que lleva a `aprobado` ("Aprobar", "Confirmar falta"). */
  approveAction: string;
  /** Botón que lleva a `rechazado` ("Rechazar", "Descartar"). */
  rejectAction: string;
  /**
   * Verbos en infinitivo para armar frases ("No se pudo confirmar…", "ya no
   * podrá aprobarse…"). Los botones NO se interpolan: son rótulos, no verbos.
   */
  approveVerb: string;
  rejectVerb: string;
  /** Cómo se nombra el registro, con artículo: "el permiso", "la incapacidad"... */
  subject: string;
  /** Nota del detalle mientras está pendiente. */
  pendingLabel: string;
  /** Etiqueta de cada estado. */
  estadoLabel: Record<EstadoAusencia, string>;
  /** Rótulos de la trazabilidad del detalle. */
  approvedByLabel: string;
  approvedAtLabel: string;
  rejectedByLabel: string;
  rejectedAtLabel: string;
  rejectReasonLabel: string;
}

/** Ciclo de aprobación normal (permiso e incapacidad), sin el sujeto. */
const APPROVAL_VOCABULARY: Omit<AusenciaVocabulary, "subject"> = {
  approveAction: "Aprobar",
  rejectAction: "Rechazar",
  approveVerb: "aprobar",
  rejectVerb: "rechazar",
  pendingLabel: "Pendiente de aprobación",
  estadoLabel: { pendiente: "Pendiente", aprobado: "Aprobado", rechazado: "Rechazado" },
  approvedByLabel: "Aprobado por",
  approvedAtLabel: "Fecha de aprobación",
  rejectedByLabel: "Rechazado por",
  rejectedAtLabel: "Fecha de rechazo",
  rejectReasonLabel: "Motivo de rechazo",
};

const VOCABULARY: Record<TipoAusencia, AusenciaVocabulary> = {
  permiso: { ...APPROVAL_VOCABULARY, subject: "el permiso" },
  incapacidad: { ...APPROVAL_VOCABULARY, subject: "la incapacidad" },
  falta_injustificada: {
    approveAction: "Confirmar falta",
    rejectAction: "Descartar",
    approveVerb: "confirmar",
    rejectVerb: "descartar",
    subject: "la falta injustificada",
    pendingLabel: "Pendiente de confirmación",
    estadoLabel: { pendiente: "Pendiente", aprobado: "Falta confirmada", rechazado: "Descartada" },
    approvedByLabel: "Confirmada por",
    approvedAtLabel: "Fecha de confirmación",
    rejectedByLabel: "Descartada por",
    rejectedAtLabel: "Fecha de descarte",
    rejectReasonLabel: "Motivo del descarte",
  },
};

/**
 * Vocabulario del tipo. Un `tipo` fuera del catálogo (dato heredado) se lee
 * con el ciclo normal para no romper la vista.
 */
export const getAusenciaVocabulary = (tipo: string): AusenciaVocabulary =>
  VOCABULARY[tipo as TipoAusencia] ?? { ...APPROVAL_VOCABULARY, subject: "el registro" };

const ESTADO_STYLE: Record<EstadoAusencia, Omit<StatusBadgeConfigEntry, "label">> = {
  pendiente: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  aprobado: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  rechazado: {
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

/** Configuración del badge de estado con las etiquetas del tipo. */
export const getEstadoAusenciaCfg = (tipo: string): Record<EstadoAusencia, StatusBadgeConfigEntry> => {
  const { estadoLabel } = getAusenciaVocabulary(tipo);
  return {
    pendiente: { ...ESTADO_STYLE.pendiente, label: estadoLabel.pendiente },
    aprobado: { ...ESTADO_STYLE.aprobado, label: estadoLabel.aprobado },
    rechazado: { ...ESTADO_STYLE.rechazado, label: estadoLabel.rechazado },
  };
};

/** Etiqueta del estado según el tipo, o `null` si el valor está fuera del catálogo. */
export const getEstadoAusenciaLabel = (tipo: string, estado: string): string | null =>
  (getAusenciaVocabulary(tipo).estadoLabel as Record<string, string>)[estado] ?? null;

/**
 * Cómo se nombra un registro en conflicto dentro del mensaje de traslape: tipo
 * y estado con la concordancia correcta ("un permiso pendiente", "una falta
 * injustificada confirmada"...). Solo se usa con registros que OCUPAN el
 * calendario (pendientes o aprobados).
 *
 * `switch` exhaustivo SIN `default`: un tipo nuevo en `TipoAusencia` es un
 * error de tipos aquí, no un texto genérico en silencio.
 */
export const describeAusencia = (tipo: TipoAusencia, estado: EstadoAusencia): string => {
  const aprobado = estado === ESTADO_APROBADO;
  switch (tipo) {
    case "permiso":
      return aprobado ? "un permiso aprobado" : "un permiso pendiente";
    case "incapacidad":
      return aprobado ? "una incapacidad aprobada" : "una incapacidad pendiente";
    case "falta_injustificada":
      return aprobado
        ? "una falta injustificada confirmada"
        : "una falta injustificada pendiente de confirmar";
  }
};
