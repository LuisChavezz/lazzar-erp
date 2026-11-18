import type {
  GoogleEmailMessage,
  RawGoogleEmailMessage,
} from "../interfaces/google.interface";

const text = (value: string | null | undefined): string =>
  typeof value === "string" ? value : "";

/**
 * Completa con cadenas vacías los campos que falten, para que la lista y el
 * detalle nunca llamen métodos de string sobre `undefined` (el `TypeError` de
 * un mensaje que llega como `{id}`). El mensaje se conserva: abrir su detalle
 * pide el correo completo por id.
 */
export const normalizeGmailMessage = (raw: RawGoogleEmailMessage): GoogleEmailMessage => ({
  id: raw.id,
  threadId: text(raw.threadId),
  snippet: text(raw.snippet),
  subject: text(raw.subject),
  from: text(raw.from),
  from_full: text(raw.from_full),
  to: text(raw.to),
  date: text(raw.date),
});

/** Normaliza el listado y descarta las entradas sin id (no se pueden abrir). */
export const normalizeGmailMessages = (
  raw: ReadonlyArray<RawGoogleEmailMessage | null | undefined> | null | undefined,
): GoogleEmailMessage[] =>
  (raw ?? [])
    .filter((m): m is RawGoogleEmailMessage => typeof m?.id === "string" && m.id !== "")
    .map(normalizeGmailMessage);
