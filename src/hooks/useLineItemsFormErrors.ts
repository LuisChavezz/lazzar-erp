import { useState } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import type { ParsedLineItemsError } from "@/src/utils/parseLineItemsDrfError";

interface LineItemsFormErrorsOptions {
  /** Llave del arreglo de líneas en los valores del formulario (`pago_detalles`). */
  linesKey: string;
  /**
   * Campo de cabecera DERIVADO de las líneas (el total). El backend reporta ahí
   * el cuadre, y como no tiene input propio, cualquier edición de línea lo limpia.
   */
  totalField: string;
  /** Primera frase del banner tras un error del backend ("No se registró ningún pago."). */
  bannerPrefix: string;
}

/**
 * Errores de un formulario con LÍNEAS, de sus dos orígenes (schema y backend):
 *
 * - los de CABECERA viven en `useFormFieldErrors` (el de servidor gana; editar
 *   el campo quita los dos);
 * - los de LÍNEA (`<líneas>.<i>.<campo>`, `<líneas>.<i>._form` y el del arreglo,
 *   `<líneas>`) viven aparte, porque quitar o reemplazar líneas recorre los
 *   índices y los invalida todos a la vez;
 * - el banner de "todo o nada" tras un error del backend.
 *
 * Editar el campo de una línea limpia también el error de esa LÍNEA y el del
 * total: el usuario la está corrigiendo y la suma cambió.
 */
export function useLineItemsFormErrors({ linesKey, totalField, bannerPrefix }: LineItemsFormErrorsOptions) {
  const header = useFormFieldErrors<string>();
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);

  const linePrefix = `${linesKey}.`;
  const isLinePath = (path: string) => path === linesKey || path.startsWith(linePrefix);
  /** `<líneas>.<i>.<campo>` → `<líneas>.<i>._form` (o `null` si no es campo de línea). */
  const lineFormKeyOf = (path: string): string | null => {
    if (!path.startsWith(linePrefix)) return null;
    const [index, field] = path.slice(linePrefix.length).split(".", 2);
    return /^\d+$/.test(index) && field ? `${linePrefix}${index}._form` : null;
  };

  const getError = (path: string): FormFieldError | undefined => {
    if (!isLinePath(path)) return header.getError(path);
    return lineErrors[path] ? { message: lineErrors[path] } : undefined;
  };

  const clearError = (path: string) => {
    if (!isLinePath(path)) {
      header.clearFieldErrors(path);
      return;
    }
    const lineFormKey = lineFormKeyOf(path);
    const keys = [path, lineFormKey !== path ? lineFormKey : null].filter(
      (key): key is string => key !== null,
    );
    setLineErrors((prev) => {
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
    if (lineFormKey !== null) header.clearFieldErrors(totalField);
  };

  /** Descarta los errores de línea y el banner (quitar o reemplazar líneas). */
  const resetLineErrors = () => {
    setLineErrors({});
    setServerBanner(null);
  };

  /** Resultado del schema al enviar: sustituye TODOS los errores. */
  const applyValidationIssues = (issues: readonly { path: readonly PropertyKey[]; message: string }[]) => {
    const headerErrors: Record<string, string> = {};
    const nextLineErrors: Record<string, string> = {};
    issues.forEach((issue) => {
      const key = issue.path.map(String).join(".");
      const target = isLinePath(key) ? nextLineErrors : headerErrors;
      if (!target[key]) target[key] = issue.message;
    });
    header.clearServerErrors();
    header.replaceClientErrors(headerErrors);
    setLineErrors(nextLineErrors);
  };

  /** Reparte el error del backend entre cabecera, líneas y banner. */
  const applyServerError = <H extends string>(parsed: ParsedLineItemsError<H>) => {
    Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
      if (typeof message === "string" && message) header.setServerFieldError(field, message);
    });
    const next: Record<string, string> = {};
    Object.entries(parsed.lineErrors).forEach(([index, fields]) => {
      Object.entries(fields).forEach(([field, message]) => {
        next[`${linePrefix}${index}.${field}`] = message;
      });
    });
    setLineErrors((prev) => ({ ...prev, ...next }));

    const hasFieldOrLine =
      Object.keys(parsed.fieldErrors).length > 0 || Object.keys(parsed.lineErrors).length > 0;
    const detail = parsed.formError ?? (hasFieldOrLine ? "Revisa los campos marcados." : "Intenta de nuevo.");
    // El alta es atómica: se dice explícitamente que NADA quedó registrado.
    setServerBanner(`${bannerPrefix} ${detail}`);
  };

  const clearErrors = () => {
    header.clearAllErrors();
    setLineErrors({});
  };

  return {
    getError,
    clearError,
    resetLineErrors,
    applyValidationIssues,
    applyServerError,
    clearErrors,
    serverBanner,
    setServerBanner,
  };
}
