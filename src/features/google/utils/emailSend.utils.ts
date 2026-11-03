import type { GoogleEmailPayload } from "../interfaces/google.interface";

/** Resultado común de los hooks `useSend*Email`/`useGoogleSendEmail`. */
export type SendEmailResult = { recipient: string; subject: string };

/**
 * Envía `body` al API Route Next.js indicado para que renderice el correo con
 * react-email en Node.js (sin llamadas al backend externo) y devuelve el
 * payload ya renderizado. Compartido por `usePrepareInvoiceEmail`,
 * `usePreparePurchaseOrderEmail` y `usePrepareQuoteEmail` (cotizaciones) — solo
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
