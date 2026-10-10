import type {
  CriticalPathUpdateBody,
  CriticalPathWritableFields,
  ProductionOrderCriticalPath,
} from "../interfaces/production-order-critical-path.interface";
import type { CriticalPathValues } from "../schemas/production-order-critical-path.schema";

const BOOLEAN_FIELDS = [
  "existencia_tela",
  "sin_existencia_tela",
  "existencia_avios",
  "sin_existencia_avios",
  "corte_externo",
  "kit_completo",
  "corte_recibido",
] as const satisfies readonly (keyof CriticalPathWritableFields)[];

export const DATE_FIELDS = [
  "fecha_liberacion_paquete_tecnico",
  "fecha_real_surtido_telas",
  "fecha_real_surtido_avios",
  "fecha_embarque_materia_prima",
  "fecha_llegada_centro_confeccion",
  "fecha_trazo",
  "fecha_real_corte",
] as const satisfies readonly (keyof CriticalPathWritableFields)[];

/**
 * Cantidad guardada ("120.00") como entero para el input ("120"). Solo se
 * quitan ceros de la fracción: "120.50" se muestra TAL CUAL, sin redondear, y
 * la validación pide corregirlo antes de guardar.
 */
const toCantidadValue = (stored: string | null): string =>
  stored === null ? "" : stored.replace(/\.0*$/, "");

/** Valores del formulario a partir del registro guardado (`null` → ""). */
export const toCriticalPathValues = (data: ProductionOrderCriticalPath): CriticalPathValues => ({
  fecha_liberacion_paquete_tecnico: data.fecha_liberacion_paquete_tecnico ?? "",
  estatus_paquete_tecnico: data.estatus_paquete_tecnico ?? "",
  existencia_tela: data.existencia_tela,
  sin_existencia_tela: data.sin_existencia_tela,
  existencia_avios: data.existencia_avios,
  sin_existencia_avios: data.sin_existencia_avios,
  fecha_real_surtido_telas: data.fecha_real_surtido_telas ?? "",
  fecha_real_surtido_avios: data.fecha_real_surtido_avios ?? "",
  corte_externo: data.corte_externo,
  comentarios_telas_avios: data.comentarios_telas_avios ?? "",
  kit_completo: data.kit_completo,
  fecha_embarque_materia_prima: data.fecha_embarque_materia_prima ?? "",
  fecha_llegada_centro_confeccion: data.fecha_llegada_centro_confeccion ?? "",
  fecha_trazo: data.fecha_trazo ?? "",
  fecha_real_corte: data.fecha_real_corte ?? "",
  cantidad_real_corte: toCantidadValue(data.cantidad_real_corte),
  corte_recibido: data.corte_recibido,
});

/**
 * Cantidad como se envía: el entero sin ceros a la izquierda, o `null` si está
 * vacía. Un valor que no es entero se devuelve tal cual: la validación ya lo
 * detuvo, y así nunca se confunde con otro.
 */
const normalizeCantidad = (raw: string): string | null => {
  const value = raw.trim();
  if (value === "") return null;
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, "") : value;
};

/** Comentario como se envía: sin espacios sobrantes y `null` si queda vacío. */
const normalizeComentarios = (raw: string): string | null => raw.trim() || null;

/**
 * Cuerpo del PATCH con SOLO los campos que cambiaron respecto a la apertura.
 * Vacío = no hay nada que guardar.
 *
 * Solo viajan los cambios: así el PATCH no pisa lo que otra persona haya
 * guardado en los demás campos mientras el diálogo estaba abierto.
 */
export const buildCriticalPathBody = (
  values: CriticalPathValues,
  initial: CriticalPathValues
): CriticalPathUpdateBody => {
  const body: CriticalPathUpdateBody = {};

  BOOLEAN_FIELDS.forEach((field) => {
    if (values[field] !== initial[field]) body[field] = values[field];
  });

  DATE_FIELDS.forEach((field) => {
    if (values[field] !== initial[field]) body[field] = values[field] || null;
  });

  if (values.estatus_paquete_tecnico !== initial.estatus_paquete_tecnico) {
    body.estatus_paquete_tecnico = values.estatus_paquete_tecnico || null;
  }

  const cantidad = normalizeCantidad(values.cantidad_real_corte);
  if (cantidad !== normalizeCantidad(initial.cantidad_real_corte)) {
    body.cantidad_real_corte = cantidad;
  }

  const comentarios = normalizeComentarios(values.comentarios_telas_avios);
  if (comentarios !== normalizeComentarios(initial.comentarios_telas_avios)) {
    body.comentarios_telas_avios = comentarios;
  }

  return body;
};
