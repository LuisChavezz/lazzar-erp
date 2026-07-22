import axios from "axios";
import { NextResponse } from "next/server";
import { ngrok_api } from "@/src/api/ngrok.api";
import { requireAuthenticatedSession } from "@/src/lib/routeHandlers";
import {
  MAX_EMBROIDERY_IMAGE_BYTES,
  MAX_EMBROIDERY_IMAGE_LABEL,
  isAllowedUploadPath,
} from "@/src/features/quotes/constants/embroideryUpload";
import type { NgrokUploadResponse } from "@/src/features/quotes/services/ngrok.actions";

export const runtime = "nodejs";

/**
 * Proxy interno de subida de arte de bordado.
 *
 * Mantiene el token del servidor de archivos fuera del navegador y, de paso,
 * aplica del lado servidor las dos validaciones que antes no existían en
 * ningún punto del flujo: el tamaño del archivo y el destino de escritura.
 * Ambas son autoritativas aquí — la guarda del cliente solo evita el viaje
 * de red, no sustituye a esta.
 */
export async function POST(request: Request) {
  // Módulo de Ventas (CRM) — mismo permiso que protege /sales en el proxy.
  const authResult = await requireAuthenticatedSession("R-CRM");

  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }

  let incoming: FormData;

  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const currentPath = incoming.get("currentPath");
  const image = incoming.get("image");

  if (typeof currentPath !== "string" || !currentPath) {
    return NextResponse.json(
      { error: "El campo currentPath es requerido." },
      { status: 400 },
    );
  }

  /* `currentPath` termina siendo la ruta de escritura dentro del recurso
   * compartido, así que se valida contra el allowlist en vez de reenviar lo
   * que mande el cliente. */
  if (!isAllowedUploadPath(currentPath)) {
    return NextResponse.json(
      { error: "Ruta de destino no permitida." },
      { status: 400 },
    );
  }

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "El archivo de imagen es requerido." },
      { status: 400 },
    );
  }

  if (image.size > MAX_EMBROIDERY_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `La imagen supera el límite de ${MAX_EMBROIDERY_IMAGE_LABEL}.` },
      { status: 413 },
    );
  }

  /* El orden importa: multer procesa los campos conforme los recibe, así que
   * `currentPath` debe ir ANTES del archivo. Se reconstruye el FormData en vez
   * de reenviar el recibido para garantizar ese orden explícitamente. */
  const forwarded = new FormData();
  forwarded.append("currentPath", currentPath);
  forwarded.append("image", image, image.name);

  try {
    const { data } = await ngrok_api.post<NgrokUploadResponse>(
      "/api/external-upload",
      forwarded,
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al subir la imagen de bordado:", error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor de imágenes." },
        { status: 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : "No se pudo cargar la imagen.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
