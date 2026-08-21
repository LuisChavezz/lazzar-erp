import { AxiosError } from "axios";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

export const EMBROIDERY_UPDATE_GENERIC_ERROR =
  "No se pudo actualizar la orden de bordado";

/**
 * Mensaje del `400` cross-tenant de `proveedor`.
 *
 * El backend responde con su diagnóstico interno —"Proveedor id=27 pertenece a
 * empresa 3, no coincide con empresa de la OB 1."—, que nombra ids que el
 * usuario no ve en ninguna pantalla. Se sustituye por el hecho accionable; el
 * texto original queda en la respuesta para quien depure.
 */
const PROVEEDOR_CROSS_TENANT_MESSAGE =
  "El proveedor seleccionado no pertenece a la empresa de esta orden.";

/**
 * Mensaje de usuario para un fallo de `PATCH /produccion/orden-bordado/{id}/`.
 *
 * Existe porque `extractErrorMessage` —el helper compartido— solo entiende la
 * forma `{ error: string }` del backend, y este endpoint rechaza POR CAMPO, a
 * la manera estándar de DRF: `{"proveedor": ["…"]}`. Con solo el helper
 * genérico, ese 400 caía en `error.message` y el toast decía "Request failed
 * with status code 400", que no le dice nada a nadie.
 *
 * Vive aparte de `parseEmbroideryOrderError` a propósito: aquél normaliza el
 * `POST` del ALTA (formas `err`/`detalles_override`/409 de duplicado), que no
 * acepta `proveedor` ni puede producir este error. Mezclarlos habría metido en
 * el alta una rama inalcanzable.
 *
 * Función PURA, sin dependencias de React, por el mismo motivo que su vecina:
 * puede ejercitarse directamente contra cada forma del contrato.
 */
export function parseEmbroideryUpdateError(error: unknown): string {
  const data = error instanceof AxiosError ? error.response?.data : undefined;

  // Forma A: `ValidationError("texto")` a nivel no-campo, que DRF serializa
  // como un ARREGLO plano en la raíz.
  if (Array.isArray(data)) {
    for (const entry of data) {
      const message = firstDrfMessage(entry);
      if (message) return message;
    }
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;

    // `proveedor` es la ÚNICA clave con mensaje propio, y solo para el rechazo
    // cross-tenant: el del backend nombra ids de empresa que el usuario no ve
    // en ninguna pantalla. Se reconoce por su texto —no por la sola presencia
    // de la clave—, porque el mismo campo produce otros 400 con causa
    // distinta: un id que ya no existe (proveedor dado de baja después de que
    // se cacheara el catálogo) lo rechaza el `PrimaryKeyRelatedField` antes de
    // llegar al `validate()`, y anunciarlo como problema de empresa mandaría a
    // revisar lo que no es. Cualquier otro mensaje pasa tal cual.
    const proveedorMessage = firstDrfMessage(record.proveedor);
    if (proveedorMessage) {
      return /no coincide con empresa/i.test(proveedorMessage)
        ? PROVEEDOR_CROSS_TENANT_MESSAGE
        : proveedorMessage;
    }

    // El resto de las claves se recorren SIN enumerarlas: el serializer usa
    // `fields = '__all__'`, así que puede rechazar por campos que este archivo
    // no conoce (`pedido`, `fecha_fin`, uno nuevo…), y una lista fija los
    // dejaría caer al mensaje crudo de Axios. Mismo barrido que hace
    // `parseEmbroideryOrderError` con las claves desconocidas. `detail` y
    // `non_field_errors` entran por la misma vía, sin caso especial.
    for (const value of Object.values(record)) {
      const message = firstDrfMessage(value);
      if (message) return message;
    }
  }

  // Solo llega aquí lo que no trae cuerpo utilizable (un `{ error }` del
  // backend, un error de red, algo que no es de Axios).
  return extractErrorMessage(error, EMBROIDERY_UPDATE_GENERIC_ERROR);
}
