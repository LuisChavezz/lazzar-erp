/**
 * Endpoint HTTP para descargar el PDF de una cotizacion.
 *
 * Flujo general:
 * 1. Valida que exista una sesion autenticada.
 * 2. Valida y normaliza el `quoteId` recibido por la ruta.
 * 3. Delega la generacion del PDF al servicio correspondiente.
 * 4. Devuelve el buffer como respuesta con headers de descarga.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { generateQuotePdf } from "@/src/features/quotes/services/pdf/generateQuotePdf.server";

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

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { quoteId: quoteIdParam } = await params;
    const quoteId = parseQuoteId(quoteIdParam);

    if (!quoteId) {
      return NextResponse.json(
        { error: "El identificador de la cotizacion no es valido." },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateQuotePdf({
      quoteId,
      accessToken: session.user.accessToken,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cotizacion-${quoteId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el PDF de la cotizacion.";

    console.error("Error al generar PDF de cotizacion:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
