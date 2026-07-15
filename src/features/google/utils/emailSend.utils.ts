import { buildGoogleEmailAttachment } from "./googleEmailAttachment.utils";
import type { GoogleEmailAttachment, GoogleEmailPayload } from "../interfaces/google.interface";

/** Resultado común de los hooks `useSend*Email`/`useGoogleSendEmail`. */
export type SendEmailResult = { recipient: string; subject: string };

/**
 * Envía `body` al API Route Next.js indicado para que renderice el correo con
 * react-email en Node.js (sin llamadas al backend externo) y devuelve el
 * payload ya renderizado. Compartido por `useSendInvoiceEmail`,
 * `useSendPurchaseOrderEmail` y `useGoogleSendEmail` (cotizaciones) — solo
 * cambian la URL del Route Handler y la forma del body.
 */
export const renderEmailContent = async <T = GoogleEmailPayload>(
  url: string,
  body: unknown,
): Promise<T> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!res.ok || !data) {
    throw new Error(data?.error || "No se pudo renderizar el correo.");
  }

  return data;
};

/**
 * Dispara la generación del PDF (y, a partir de él, el adjunto en base64 con
 * su validación de tamaño) en PARALELO con la validación de `renderEmailContent`
 * — ambos dependen solo del documento a enviar — pero sin esperarlo todavía:
 * si `renderEmailContent` falla (destinatario/sesión/estatus), ese error debe
 * ganar y mostrarse primero, no uno de generación de PDF/adjunto no
 * relacionado. El catch no-op evita un "unhandled rejection" si esto falla
 * antes de que el llamador llegue a su propio `await` — no altera el valor
 * con el que la promesa resuelve.
 */
export const createEmailAttachmentPromise = (
  generatePdfBlob: () => Promise<Blob>,
  filename: string,
  mimeType: string,
  oversizeErrorMessage: string,
): Promise<GoogleEmailAttachment> => {
  const attachmentPromise = generatePdfBlob().then((blob) =>
    buildGoogleEmailAttachment(blob, filename, mimeType, oversizeErrorMessage),
  );
  attachmentPromise.catch(() => {});

  return attachmentPromise;
};
