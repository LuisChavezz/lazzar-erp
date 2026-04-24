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
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import {
  buildQuoteEmailContent,
  buildQuoteEmailSubject,
} from "@/src/features/quotes/services/email/quoteEmailContent.server";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Verificar sesion activa — usa cookies de NextAuth (localhost), no del backend Django.
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let quote: QuoteById;

  try {
    const body = (await request.json()) as { quote?: QuoteById };
    if (!body?.quote) {
      return NextResponse.json({ error: "El campo quote es requerido." }, { status: 400 });
    }
    quote = body.quote;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

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
