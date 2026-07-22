import axios from "axios";
import { NextResponse } from "next/server";
import { ngrok_api } from "@/src/api/ngrok.api";
import { requireAuthenticatedSession } from "@/src/lib/routeHandlers";
import type { NgrokImagesResponse } from "@/src/features/quotes/services/ngrok.actions";

export const runtime = "nodejs";

/**
 * Proxy interno de la galería de imágenes de bordado.
 *
 * Existe por dos motivos:
 *
 * 1. El token del servidor de archivos vive solo aquí (server-side). Antes
 *    viajaba en el bundle del navegador vía `NEXT_PUBLIC_NGROK_API_TOKEN`.
 * 2. El correo del vendedor se toma de la SESIÓN, no de un query param. El
 *    endpoint upstream (`/api/vendedor/imagenes?email=`) responde para
 *    cualquier email que reciba, así que aceptarlo del cliente permitía a
 *    cualquiera enumerar la galería de otro vendedor.
 *
 * Devuelve la respuesta upstream sin alterar su forma para que
 * `useFetchEmbroideryImages` la siga consumiendo igual.
 */
export async function GET() {
  // Módulo de Ventas (CRM) — mismo permiso que protege /sales en el proxy.
  const authResult = await requireAuthenticatedSession("R-CRM");

  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  const email = authResult.session.user.email;

  if (!email) {
    return NextResponse.json(
      { error: "La sesión no tiene un correo asociado." },
      { status: 422 },
    );
  }

  try {
    const { data } = await ngrok_api.get<NgrokImagesResponse>("/api/vendedor/imagenes", {
      params: { email },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al obtener las imagenes de bordado:", error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor de imágenes." },
        { status: 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : "No se pudieron obtener las imágenes.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
