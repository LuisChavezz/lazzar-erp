/**
 * API Route de renderizado de correo — responsabilidad unica: generar HTML.
 *
 * El cliente (useGoogleSendEmail) obtiene la cotizacion via v1_api (con cookies
 * y refresh interceptor), la envia en el body de este endpoint, y aqui solo se
 * ejecuta el renderizado server-side de QuoteEmail con react-email.
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
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Módulo de Ventas (CRM) — mismo permiso que protege /sales en el proxy.
  const authResult = await requireAuthenticatedSession("R-CRM");

  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const parsedBody = await parseRequiredJsonField(request, "quote");

  if ("errorResponse" in parsedBody) {
    return parsedBody.errorResponse;
  }

  const quote = parsedBody.value as QuoteById;

  if (!quote.correo_facturas) {
    return NextResponse.json(
      { error: "El cliente no tiene correo de facturación registrado." },
      { status: 422 }
    );
  }

  try {
    // Unica responsabilidad: renderizar el template con react-email en Node.js.
    const subject = buildQuoteEmailSubject(quote);
    const { html, text } = await buildQuoteEmailContent(quote);

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
