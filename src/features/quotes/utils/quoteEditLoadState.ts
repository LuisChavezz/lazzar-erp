/** Toast del formulario de edición cuando una relectura de la cotización falla. */
export const QUOTE_EDIT_REFETCH_ERROR_MESSAGE =
  "No se pudo actualizar la información. Tus cambios se conservan.";

interface QuoteEditLoadInput {
  /** ¿Hay cotización cargada? */
  hasQuote: boolean;
  /** ¿Su estatus permite editarla? (`canEditQuote`) */
  isEditableStatus: boolean;
  /** 404 o 403 definitivo de `useQuote` (`isDefinitiveError`). */
  isAccessError: boolean;
  /** ¿Respondió una consulta de ESTE montaje? (`isFetchedAfterMount`) */
  isFetchedAfterMount: boolean;
  /** `error` de `useQuote`: solo existe si la consulta nunca cargó. */
  hasLoadError: boolean;
}

/**
 * Qué hace el formulario de edición con el estado de la consulta de la
 * cotización.
 *
 * - `accessDenied`: 404/403 respondido por ESTE montaje. Con un error viejo de
 *   la caché no se avisa ni se redirige: el acceso pudo cambiar entretanto.
 * - `shouldRedirect`: al listado, por estatus no editable (en silencio) o por
 *   acceso denegado (con aviso).
 * - `loadFailed`: fallo TÉCNICO de la carga inicial (500, red, timeout): el
 *   formulario muestra un error con reintento. Un fallo en una relectura con
 *   datos ya cargados no llega aquí: se conserva el formulario y avisa el
 *   toast de `useQuote`.
 */
export const getQuoteEditLoadState = ({
  hasQuote,
  isEditableStatus,
  isAccessError,
  isFetchedAfterMount,
  hasLoadError,
}: QuoteEditLoadInput) => {
  const accessDenied = isAccessError && isFetchedAfterMount;
  return {
    accessDenied,
    shouldRedirect: (hasQuote && !isEditableStatus) || accessDenied,
    loadFailed: hasLoadError && !isAccessError,
  };
};
