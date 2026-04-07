/**
 * reflective-form.ts
 * Utilidades y tipos para el formulario de configuraciones de reflejante.
 * - `ReflectiveConfigForm`: forma interna editable de una configuración.
 * - `ReflectiveConfigFieldErrors`: errores por campo.
 * - `createReflectiveConfigForm`: fábrica para crear formularios con id único.
 */
import type { QuoteFormValues } from "../schemas/quote.schema";

type ReflectiveSpec = NonNullable<
  NonNullable<QuoteFormValues["items"][number]["reflejantes"]>["especificaciones"]
>[number];

/**
 * Campos editables de una configuración de reflejante.
 */
export type ReflectiveEditableField = "opcion" | "posiciones" | "tipo";

/**
 * Errores por campo para cada configuración.
 */
export interface ReflectiveConfigFieldErrors {
  opcion?: string;
  posiciones?: string;
  tipo?: string;
}

/**
 * Representación interna (form) de una configuración de reflejante.
 */
export interface ReflectiveConfigForm {
  id: string;
  opcion: ReflectiveSpec["opcion"];
  posiciones: ReflectiveSpec["posicion"][];
  tipo: ReflectiveSpec["tipo"];
}

/**
 * createReflectiveConfigForm
 * Fábrica que crea una configuración editable con `id` único,
 * opcionalmente inicializada a partir de valores parciales.
 */
export const createReflectiveConfigForm = (
  initial?: Partial<Omit<ReflectiveConfigForm, "id">>
): ReflectiveConfigForm => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  opcion: initial?.opcion ?? "",
  posiciones: initial?.posiciones ?? [],
  tipo: initial?.tipo ?? "",
});
