import { AxiosError } from "axios";

/**
 * Decodifica el cuerpo de un error de Axios pedido con `responseType: "blob"`.
 *
 * Con ese `responseType` el navegador entrega TODA respuesta como `Blob`,
 * también la de error, así que un 400 de DRF (`{"campo": "mensaje"}`) llega
 * ilegible para `firstDrfMessage`/`extractErrorMessage`. Aquí se lee como texto
 * y se reemplaza `error.response.data` por el JSON (o por el texto, si no lo
 * es), para que el resto del manejo de errores funcione sin cambios.
 *
 * Un cuerpo HTML (página de error de Django, Vercel o un proxy; por
 * `Content-Type` o porque empieza con `<`) NO se expone: `data` queda en
 * `undefined` para que quien lo maneje caiga a su mensaje de respaldo en vez de
 * mostrar marcado en un aviso.
 *
 * Devuelve el MISMO error (mutado) para relanzarlo: `throw await readBlobErrorBody(e)`.
 * Si no hay `response` (error de red) o el cuerpo no es un `Blob`, lo devuelve tal cual.
 */
export async function readBlobErrorBody(error: unknown): Promise<unknown> {
  if (!(error instanceof AxiosError)) return error;
  const response = error.response;
  if (!response || !(response.data instanceof Blob)) return error;

  try {
    const contentType = String(response.headers?.["content-type"] ?? "");
    const text = await response.data.text();
    if (contentType.includes("text/html") || text.trimStart().startsWith("<")) {
      response.data = undefined;
      return error;
    }
    try {
      response.data = JSON.parse(text);
    } catch {
      response.data = text;
    }
  } catch {
    // Si el Blob no se puede leer, se conserva tal cual: los parsers caerán a
    // su mensaje de respaldo.
  }
  return error;
}
