/**
 * API Route de renderizado de correo — responsabilidad unica: generar HTML.
 *
 * El cliente (usePrepareQuoteEmail) obtiene la cotizacion via v1_api (con cookies
 * y refresh interceptor), la envia en el body de este endpoint, y aqui solo se
 * ejecuta el renderizado server-side de QuoteEmail con react-email. El código de
 * la moneda (`moneda_codigo`) también llega en el body: el retrieve solo trae
 * `moneda` como id y aquí no se puede consultar el catálogo.
 *
 * No realiza ninguna llamada al backend externo, por lo que no depende de las
 * cookies auth-jwt / auth-refresh-jwt que solo el browser puede enviar a ese dominio.
 */
import { NextResponse } from "next/server";
import { requireAuthenticatedSession, parseRequiredJsonField } from "@/src/lib/routeHandlers";
import {
  buildQuoteEmailContent,
  buildQuoteEmailSubject,
} from "@/src/features/quotes/services/email/quoteEmailContent.server";
import { quoteEmailMonedaCodigoSchema } from "@/src/features/quotes/schemas/quote-email-payload.schema";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Sección de Cotizaciones — mismo permiso que protege /sales/quotes en el
  // proxy: el envío es de una cotización y su único disparador
  // (`usePrepareQuoteEmail`) vive en esa pantalla.
  const authResult = await requireAuthenticatedSession("R-CRM-COTIZACIONES");

  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const parsedBody = await parseRequiredJsonField(request, "quote");

  if ("errorResponse" in parsedBody) {
    return parsedBody.errorResponse;
  }

  const quote = parsedBody.value as QuoteById;

  const parsedMonedaCodigo = quoteEmailMonedaCodigoSchema.safeParse(parsedBody.body.moneda_codigo);

  if (!parsedMonedaCodigo.success) {
    return NextResponse.json(
      { error: "El código de moneda de la cotización es inválido." },
      { status: 400 }
    );
  }

  const monedaCodigo = parsedMonedaCodigo.data ?? null;

  if (!quote.correo_facturas) {
    return NextResponse.json(
      { error: "El cliente no tiene correo de facturación registrado." },
      { status: 422 }
    );
  }

  try {
    // Unica responsabilidad: renderizar el template con react-email en Node.js.
    const subject = buildQuoteEmailSubject(quote);
    const { html, text } = await buildQuoteEmailContent(quote, monedaCodigo);

    return NextResponse.json({
      to: quote.correo_facturas,
      subject,
      body: text,
      html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo renderizar el correo.";

    console.error("Error al renderizar correo de cotizacion:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
