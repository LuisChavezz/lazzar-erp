"use client";

import { useState } from "react";
import type { RefObject } from "react";
import type { QuoteFormValues } from "../schemas/quote.schema";
import { scrollToFirstValidationError } from "../utils/scrollToFirstValidationError";
import {
  buildQuoteFieldLabel,
  type QuoteReviewValidationError,
} from "../utils/validateQuoteForReview";

/** Un error del submit: ruta en el formulario y mensaje. */
export interface QuoteSubmitIssue {
  path: (string | number)[];
  message: string;
}

/** Campos que se derivan de `telefono_pagos` mientras "Usar el mismo teléfono" está marcada. */
const MIRRORED_PHONE_FIELDS = new Set(["telefonoEnvio", "celularEnvio"]);

/**
 * Junta los errores de un Guardar: los de Zod más el de la regla del anticipo,
 * que el schema no conoce porque depende del total en vivo.
 *
 * Con "Usar el mismo teléfono" marcada se omiten los errores de los teléfonos
 * de envío: se validan con el valor derivado de `telefono_pagos`
 * (`withMirroredShippingPhones`), que ya trae el mismo error en un campo
 * editable, y listarlos señalaría campos deshabilitados.
 */
export const collectQuoteSubmitIssues = (
  zodIssues: readonly { path: readonly PropertyKey[]; message: string }[],
  values: Pick<QuoteFormValues, "usarMismoTelefono">,
  anticipoIssue: QuoteSubmitIssue | null,
): QuoteSubmitIssue[] => {
  const issues: QuoteSubmitIssue[] = zodIssues
    .map((issue) => ({
      path: issue.path.filter(
        (segment): segment is string | number =>
          typeof segment === "string" || typeof segment === "number"
      ),
      message: issue.message,
    }))
    .filter(
      (issue) =>
        !(values.usarMismoTelefono && MIRRORED_PHONE_FIELDS.has(String(issue.path[0] ?? "")))
    );
  // Un anticipo que ya falla en el schema (negativo) no se reporta además como
  // mayor al total, igual que en el backend.
  if (anticipoIssue && !issues.some((issue) => issue.path[0] === "anticipo")) {
    issues.push(anticipoIssue);
  }
  return issues;
};

/**
 * Resumen de errores del Guardar (EC-563, CO-07): lista campo y mensaje con el
 * mismo formato y etiquetas que la validación previa a revisión, y al cerrarse
 * lleva la vista al primer error. Lo comparten los tres hooks que alimentan
 * `QuoteFormContent`.
 */
export function useQuoteSubmitErrorSummary(formRef: RefObject<HTMLFormElement | null>) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<QuoteReviewValidationError[]>([]);
  const [paths, setPaths] = useState<string[]>([]);

  const showErrorSummary = (issues: QuoteSubmitIssue[]) => {
    setErrors(
      issues.map((issue) => ({ field: buildQuoteFieldLabel(issue.path), message: issue.message }))
    );
    setPaths(issues.map((issue) => issue.path.map(String).join(".")).filter(Boolean));
    setOpen(true);
  };

  const errorSummaryProps = {
    open,
    errors,
    onOpenChange: setOpen,
    /**
     * Corre cuando el diálogo YA se cerró: es el punto en que Radix devolvería
     * el foco al botón Guardar, así que se cancela y se lleva al primer error.
     */
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      if (formRef.current) {
        scrollToFirstValidationError(formRef.current, paths);
      }
    },
  };

  return { showErrorSummary, errorSummaryProps };
}
