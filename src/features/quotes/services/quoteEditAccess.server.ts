import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Quote } from "../interfaces/quote.interface";
import { canEditQuote } from "../utils/quoteStatusRules";

type QuoteStatusResponse = Pick<Quote, "estatus">;

const QUOTES_LIST_PATH = "/sales/quotes";

async function getQuoteStatusForEditGuard(quoteId: number): Promise<number | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) return null;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/ventas/cotizaciones/${quoteId}/`,
      {
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const quote = (await response.json()) as QuoteStatusResponse;
    return quote.estatus ?? null;
  } catch {
    return null;
  }
}

// ─── Redirige cuando la cotización no puede editarse desde la ruta /edit ─────
export async function redirectIfQuoteCannotBeEdited(quoteId: number): Promise<void> {
  if (!Number.isFinite(quoteId) || quoteId <= 0) {
    redirect(QUOTES_LIST_PATH);
  }

  // Valida en servidor cuando hay acceso directo por URL. Si el backend no responde
  // desde este entorno, el guard del hook cliente mantiene el mismo bloqueo.
  const quoteStatus = await getQuoteStatusForEditGuard(quoteId);
  if (quoteStatus !== null && !canEditQuote(quoteStatus)) {
    redirect(QUOTES_LIST_PATH);
  }
}