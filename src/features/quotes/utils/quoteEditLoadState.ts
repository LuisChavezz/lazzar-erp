import { isQuoteDetailDefinitiveError } from "./quoteResource";

/** Toast del formulario de edición cuando una relectura de la cotización falla. */
export const QUOTE_EDIT_REFETCH_ERROR_MESSAGE =
  "No se pudo actualizar la información. Tus cambios se conservan.";

/**
 * Qué fue el error de la ÚLTIMA lectura de la cotización: ninguno, una
 * denegación de acceso (404/403) o un fallo técnico (500, red, timeout).
 */
export type QuoteLoadErrorKind = "none" | "access" | "technical";

export const quoteLoadErrorKind = (latestError: unknown): QuoteLoadErrorKind => {
  if (latestError === null || latestError === undefined) return "none";
  return isQuoteDetailDefinitiveError(latestError) ? "access" : "technical";
};

interface QuoteEditLoadInput {
  /** ¿Hay cotización para mostrar? (`useQuote().data`) */
  hasQuote: boolean;
  /** ¿Su estatus permite editarla? (`canEditQuote`) */
  isEditableStatus: boolean;
  /**
   * Error de la ÚLTIMA lectura (`quoteLoadErrorKind(useQuote().latestError)`),
   * no el definitivo que `useGuardedQuery` recuerda de antes: un 500 después
   * de un 404 de otra visita es un fallo técnico, no una denegación.
   */
  latestErrorKind: QuoteLoadErrorKind;
  /** ¿Respondió una consulta de ESTE montaje? (`isFetchedAfterMount`) */
  isFetchedAfterMount: boolean;
}

/**
 * Qué hace el formulario de edición con el estado de la consulta de la
 * cotización.
 *
 * - `accessDenied`: 404/403 en la última lectura, respondido por ESTE montaje.
 *   Con un error viejo de la caché no se avisa ni se redirige: el acceso pudo
 *   cambiar entretanto.
 * - `shouldRedirect`: al listado, por estatus no editable (en silencio) o por
 *   acceso denegado (con aviso).
 * - `loadFailed`: fallo TÉCNICO sin cotización que mostrar (carga inicial, o
 *   un 500 tras un 404/403 recordado): el formulario muestra un error con
 *   reintento. Un fallo en una relectura con datos ya cargados no llega aquí:
 *   se conserva el formulario y avisa el toast de `useQuote`.
 */
export const getQuoteEditLoadState = ({
  hasQuote,
  isEditableStatus,
  latestErrorKind,
  isFetchedAfterMount,
}: QuoteEditLoadInput) => {
  const accessDenied = latestErrorKind === "access" && isFetchedAfterMount;
  return {
    accessDenied,
    shouldRedirect: (hasQuote && !isEditableStatus) || accessDenied,
    loadFailed: latestErrorKind === "technical" && !hasQuote,
  };
};
