import {
  getInvoiceNotCreditableReason,
  getRelatedInvoiceEmitBlockReason,
} from "./creditNoteStamping";

/** Campos de la factura (su retrieve) que decide la regla. */
export type CreditNoteGateInvoice = Parameters<typeof getRelatedInvoiceEmitBlockReason>[0];

/** Lo que sabe el formulario de la lectura fresca de la factura elegida. */
export interface CreditNoteInvoiceReadState<T extends CreditNoteGateInvoice> {
  /** ¿Hay factura elegida (`factura > 0`)? */
  hasInvoice: boolean;
  /** La factura, `undefined` mientras no haya respuesta o con un error definitivo. */
  invoice: T | undefined;
  isFetching: boolean;
  /** `true` cuando ESTA elección ya vio una respuesta (o un fallo) propia. */
  isFetchedAfterMount: boolean;
  /** Falló sin haber cargado nunca, por algo que no es `403`/`404` (se reintenta). */
  isInitialError: boolean;
  /** Error definitivo: `404` (no existe o no es visible) o `403` (sin permiso). */
  definitiveError: "notFound" | "forbidden" | null;
}

/**
 * Estado de la factura elegida en el formulario de alta:
 *
 * - `none`: sin factura.
 * - `checking`: llega la lectura de ESTA elección, o el reintento de una que
 *   falló (la copia en caché pudo quedar vieja).
 * - `notFound` (`404`) / `forbidden` (`403`): definitivos, sin reintento.
 * - `unavailable`: falló otra cosa; se ofrece "Reintentar".
 * - `notCreditable`: cancelada, CFDI cancelado, cancelación solicitada o
 *   eliminada (`getInvoiceNotCreditableReason`): no admite la nota, ni borrador.
 * - `pending`: timbrado sin confirmar (`cfdi_pendiente`): solo borrador.
 * - `loaded`: admite la nota.
 */
export type CreditNoteInvoiceState<T extends CreditNoteGateInvoice> =
  | { status: "none" }
  | { status: "checking" }
  | { status: "notFound" }
  | { status: "forbidden" }
  | { status: "unavailable" }
  | { status: "notCreditable"; reason: string }
  | { status: "pending"; reason: string; invoice: T }
  | { status: "loaded"; invoice: T };

export const getCreditNoteInvoiceState = <T extends CreditNoteGateInvoice>(
  read: CreditNoteInvoiceReadState<T>,
): CreditNoteInvoiceState<T> => {
  if (!read.hasInvoice) return { status: "none" };
  // Un error vigente con una petición en vuelo es un reintento: se espera.
  if (
    read.isFetching &&
    (!read.isFetchedAfterMount || read.isInitialError || read.definitiveError !== null)
  ) {
    return { status: "checking" };
  }
  if (read.definitiveError === "notFound") return { status: "notFound" };
  if (read.definitiveError === "forbidden") return { status: "forbidden" };
  if (read.isInitialError) return { status: "unavailable" };
  if (!read.invoice) return { status: "checking" };
  const notCreditableReason = getInvoiceNotCreditableReason(read.invoice.folio, read.invoice);
  if (notCreditableReason) return { status: "notCreditable", reason: notCreditableReason };
  const emitReason = getRelatedInvoiceEmitBlockReason(read.invoice);
  if (emitReason) return { status: "pending", reason: emitReason, invoice: read.invoice };
  return { status: "loaded", invoice: read.invoice };
};

/** "Emitir nota" mientras llega la lectura fresca de la factura elegida. */
export const INVOICE_STATE_CHECKING_REASON = "Consultando el estado de la factura elegida…";

/** "Emitir nota" sin poder consultar la factura elegida (fallo reintentable). */
export const INVOICE_STATE_UNKNOWN_REASON =
  "No se pudo confirmar el estado de la factura elegida: guarda la nota como borrador o vuelve a consultarla para emitirla.";

/** "Emitir nota" cuando el usuario no puede consultar la factura (`403`). */
export const INVOICE_STATE_FORBIDDEN_REASON =
  "No tienes permiso para consultar la factura elegida, así que no se puede confirmar que admita la emisión: guarda la nota como borrador.";

/**
 * Qué bloquea cada botón del formulario según el estado de la factura, o
 * `null`. `draftBlockReason` bloquea los dos ("Guardar borrador" y "Emitir
 * nota"); `emitBlockReason`, solo "Emitir nota". `folio` es el de la CxC
 * elegida (para nombrar una factura que respondió `404`).
 */
export const getCreditNoteInvoiceGate = (
  state: CreditNoteInvoiceState<CreditNoteGateInvoice>,
  folio: string | null,
): { draftBlockReason: string | null; emitBlockReason: string | null } => {
  switch (state.status) {
    case "none":
    case "loaded":
      return { draftBlockReason: null, emitBlockReason: null };
    case "checking":
      return { draftBlockReason: null, emitBlockReason: INVOICE_STATE_CHECKING_REASON };
    case "notFound": {
      const reason = getInvoiceNotCreditableReason(folio, undefined);
      return { draftBlockReason: reason, emitBlockReason: reason };
    }
    case "forbidden":
      return { draftBlockReason: null, emitBlockReason: INVOICE_STATE_FORBIDDEN_REASON };
    case "unavailable":
      return { draftBlockReason: null, emitBlockReason: INVOICE_STATE_UNKNOWN_REASON };
    case "notCreditable":
      return { draftBlockReason: state.reason, emitBlockReason: state.reason };
    case "pending":
      return { draftBlockReason: null, emitBlockReason: state.reason };
  }
};
