import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import type { ChartOfAccountFormValues } from "../schemas/chart-of-account.schema";

export type ChartOfAccountFormField = keyof ChartOfAccountFormValues;

export type SetChartOfAccountError = (
  field: ChartOfAccountFormField,
  error: { type?: string; message?: string },
) => void;

/**
 * Reparte un `400` del backend entre los campos del formulario.
 *
 * DRF devuelve `{"<campo>": ["<mensaje>"]}` (a veces el mensaje suelto, sin
 * arreglo: de ahí `firstDrfMessage`, que acepta las dos formas). El caso que
 * importa aquí es el CÓDIGO DUPLICADO —`codigo` es único por empresa cuando no
 * está vacío—, que debe pintarse bajo su input y no quedarse solo en un toast:
 * el usuario tiene que ver en qué campo está el conflicto para corregirlo.
 *
 * Las llaves que NO son campos de este formulario (p. ej. `empresa`, o un
 * `non_field_errors`) se ignoran a propósito: no tienen dónde pintarse y las
 * cubre el toast de la mutación.
 *
 * Mismo mecanismo que `useCreateBank`/`useUpdateBank`, con dos diferencias: se
 * acota a las llaves que el formulario conoce (en vez de un cast a ciegas) y
 * desenvuelve el mensaje con el helper compartido.
 */
const FORM_FIELDS: ChartOfAccountFormField[] = [
  "codigo",
  "nombre",
  "tipo",
  "nivel",
  "acepta_movimientos",
];

export const setChartOfAccountFieldErrors = (
  error: unknown,
  setError?: SetChartOfAccountError,
): void => {
  if (!setError || !(error instanceof AxiosError)) return;
  if (error.response?.status !== 400) return;

  const data = error.response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return;

  const record = data as Record<string, unknown>;
  FORM_FIELDS.forEach((field) => {
    const message = firstDrfMessage(record[field]);
    if (message) setError(field, { type: "server", message });
  });
};
