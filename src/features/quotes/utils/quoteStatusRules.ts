// ─── Reglas compartidas de estatus para cotizaciones ─────────────────────────

const EDITABLE_QUOTE_STATUSES = new Set([1, 3]);
const REVIEWABLE_QUOTE_STATUSES = new Set([1]);
const AUTHORIZABLE_QUOTE_STATUSES = new Set([2, 5]);

export const canEditQuote = (status: number | null | undefined): boolean => {
  return typeof status === "number" && EDITABLE_QUOTE_STATUSES.has(status);
};

export const canSubmitQuoteForReview = (status: number | null | undefined): boolean => {
  return typeof status === "number" && REVIEWABLE_QUOTE_STATUSES.has(status);
};

export const canManageQuoteAuthorization = (
  status: number | null | undefined
): boolean => {
  return typeof status === "number" && AUTHORIZABLE_QUOTE_STATUSES.has(status);
};