/**
 * Endpoint HTTP para enviar una cotizacion por correo.
 *
 * Flujo general:
 * 1. Valida que exista una sesion autenticada.
 * 2. Valida y normaliza el `quoteId` recibido por la ruta.
 * 3. Delega el parseo del body y la logica de envio al servicio.
 * 4. Traduce errores de validacion a HTTP 400 y errores inesperados a HTTP 500.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { parseSendQuoteEmailRequest } from "@/src/features/quotes/services/email/parseSendQuoteEmailRequest.server";
import { sendQuoteEmail } from "@/src/features/quotes/services/email/sendQuoteEmail.server";
import { authOptions } from "@/src/lib/auth";
import { isEmailValidationError } from "@/src/utils/email/emailAddress";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    quoteId: string;
  }>;
};

/**
 * Convierte el parametro dinamico de la ruta a un entero positivo.
 * Devuelve `undefined` cuando el valor no puede tratarse como identificador valido.
 */
const parseQuoteId = (quoteIdParam: string) => {
  const quoteId = Number(quoteIdParam);

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    return undefined;
  }

  return quoteId;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Paso 1: asegurar que el usuario tenga una sesion valida antes de usar servicios protegidos.
    const session = await getServerSession(authOptions);

    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Paso 2: validar el identificador recibido en la URL.
    const { quoteId: quoteIdParam } = await params;
    const quoteId = parseQuoteId(quoteIdParam);

    if (!quoteId) {
      return NextResponse.json({ error: "El identificador de la cotizacion no es valido." }, { status: 400 });
    }

    // Paso 3: el body se interpreta en una capa separada y luego se delega el envio completo.
    const payload = await parseSendQuoteEmailRequest(request);
    const result = await sendQuoteEmail({
      quoteId,
      accessToken: session.user.accessToken,
      requestedRecipient: payload.to,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    // Los errores de validacion conocidos se devuelven como 400 para mantener una API explicita.
    if (isEmailValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Todo lo demas se trata como error interno del flujo de envio.
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo de la cotizacion.";

    console.error("Error al enviar correo de cotizacion:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}