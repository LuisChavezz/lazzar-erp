import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createPacking } from "../services/actions";

/**
 * Mensajes de "dato desactualizado": el pendiente por empacar cambió entre que
 * se cargó el formulario y se envió (otro packing ya empacó la línea). NO son
 * un error fatal: el Paso 2 recarga el onboarding y deja reintentar. Mismo
 * criterio que picking (`STALE_DATA_RE` en `useCreatePicking`) — las frases
 * exactas del backend difieren ("...por empacar."/"...excede lo pendiente.")
 * pero calzan con el mismo patrón.
 */
const STALE_DATA_RE = /ya no tiene cantidad pendiente|excede lo pendiente/i;

/**
 * Campos del encabezado que el backend puede señalar por separado en un `400`
 * (`PackingCreateSerializer.Meta.fields`, menos `picking`/`packing_detalle`,
 * que se tratan aparte arriba). A diferencia de picking —cuyo encabezado son
 * selectores de catálogo que no pueden traer un valor inválido—, aquí son
 * decimales/enteros capturados a mano, así que sí pueden rebotar solos.
 */
const PACKING_HEADER_ERROR_FIELDS = [
  "numero_cajas",
  "peso_total",
  "volumen_total",
  "fecha_inicio",
  "fecha_fin",
  "observaciones",
] as const;

/**
 * `packing_detalle` puede llegar en TRES formas distintas (confirmado contra
 * el backend):
 *  1. Arreglo de strings a nivel de campo del serializer —p. ej. `["This
 *     field is required."]` cuando falta el arreglo completo.
 *  2. STRING plano (no arreglo) para los rechazos de servicio —p. ej.
 *     `"Debe enviar al menos una línea para empacar."` o los de dato
 *     desactualizado—, una forma que picking NO tiene (ahí el equivalente de
 *     servicio siempre llega como arreglo plano a nivel raíz, no anidado bajo
 *     una clave). `firstDrfMessage` ya cubre AMBAS (1) y (2): acepta tanto un
 *     string como un arreglo de strings.
 *  3. Arreglo con UN OBJETO POR LÍNEA enviada (forma estándar de un
 *     `ListSerializer` cuando el rechazo es de un CAMPO dentro de una línea,
 *     p. ej. `cantidad_empacada` bajo `min_value=0.0001`): `{}` si esa línea
 *     es válida, `{campo: ["msg"]}` si no. Esta es la única forma que
 *     `firstDrfMessage` no resuelve por sí solo.
 */
function firstPackingDetalleMessage(value: unknown): string | undefined {
  const flat = firstDrfMessage(value);
  if (flat) return flat;
  if (!Array.isArray(value)) return undefined;
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    for (const fieldValue of Object.values(entry as Record<string, unknown>)) {
      const message = firstDrfMessage(fieldValue);
      if (message) return message;
    }
  }
  return undefined;
}

/**
 * Error de creación de packing, normalizado desde el contrato del backend.
 *
 * Sin campos con input propio en la UI (el Paso 1 es un buscador, no un
 * `FormSelect`, y el Paso 2 no atribuye errores por campo de encabezado): todo
 * error de operación —`picking`, `packing_detalle`, errores de servicio en
 * arreglo plano, de folio— se vuelca a `formError`/`messages` (el banner).
 *
 * `staleData` marca los errores de pendiente desactualizado, que el Paso 2
 * trata recargando datos en lugar de mostrar un error terminal.
 */
export interface ParsedPackingError {
  formError?: string;
  messages: string[];
  staleData: boolean;
}

/**
 * Normaliza el error de `POST /wms/packings/`. Maneja las DOS formas del
 * contrato: arreglo plano a nivel raíz (`["mensaje"]`, validaciones de
 * contexto o de folio) y objeto con clave (`{"picking": "mensaje"}` /
 * `{"packing_detalle": ...}`, en cualquiera de sus tres formas — ver
 * `firstPackingDetalleMessage`).
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de error siempre aparezca.
 */
export function parsePackingError(error: unknown): ParsedPackingError {
  const result: ParsedPackingError = {
    messages: [],
    staleData: false,
  };

  const finalize = (): ParsedPackingError => {
    result.staleData = result.messages.some((message) => STALE_DATA_RE.test(message));
    return result;
  };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar el packing.";
    return finalize();
  }

  const data = error.response?.data;

  // Respuesta en texto plano (ej. 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return finalize();
  }

  // Forma 1: arreglo plano `["mensaje"]` — validaciones de contexto (empresa,
  // sucursal, picking cancelado) o de folio (serie/folio no configurada).
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar el packing.";
    }
    return finalize();
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar el packing.";
    return finalize();
  }

  // Forma 2: objeto con clave.
  const record = data as Record<string, unknown>;

  const detail = firstDrfMessage(record.detail);
  if (detail) {
    result.formError = detail;
    result.messages.push(detail);
  }
  const nonField = firstDrfMessage(record.non_field_errors);
  if (nonField) {
    result.formError = result.formError ?? nonField;
    result.messages.push(nonField);
  }

  // `picking` no tiene un slot de error propio en el Paso 2 (se eligió en el
  // Paso 1, sobre un catálogo ya cargado) — se trata como de operación.
  const pickingMessage = firstDrfMessage(record.picking);
  if (pickingMessage) {
    result.formError = result.formError ?? pickingMessage;
    result.messages.push(pickingMessage);
  }

  // `packing_detalle` es el arreglo de líneas: aquí llegan los errores de
  // pendiente desactualizado, de línea ajena al picking, de "al menos una
  // línea" y (vía `firstPackingDetalleMessage`) los de campo por línea que DRF
  // rechaza antes del servicio (cantidad inválida). No hay un input único; va
  // al banner.
  const detalleMessage = firstPackingDetalleMessage(record.packing_detalle);
  if (detalleMessage) {
    result.formError = result.formError ?? detalleMessage;
    result.messages.push(detalleMessage);
  }

  // Campos del ENCABEZADO que el backend puede rechazar por separado. Se
  // recogen SIEMPRE (no solo cuando no hubo ningún otro mensaje): un rechazo
  // de `peso_total` puede llegar acompañado de uno de `packing_detalle`, y
  // dejarlo fuera haría que el usuario corrija la línea, reintente y vuelva a
  // ser rechazado por un peso del que nunca se le avisó. Sin `fieldErrors`:
  // el Paso 2 no atribuye errores por input, todo va al banner.
  for (const field of PACKING_HEADER_ERROR_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.formError = result.formError ?? message;
      result.messages.push(message);
    }
  }

  // Fallback: cualquier otra clave desconocida contribuye al banner/toast.
  if (result.messages.length === 0) {
    Object.values(record).forEach((value) => {
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = "Error de validación al registrar el packing.";
    }
  }

  if (!result.formError && result.messages.length > 0) {
    result.formError = result.messages[0];
  }

  return finalize();
}

/**
 * Mutación para crear un packing. `onServerError` recibe el error ya
 * normalizado para que el Paso 2 lo reparta entre el banner y —si
 * `staleData`— dispare la recarga del onboarding.
 *
 * Para los errores de dato desactualizado se usa un toast NEUTRO (no de
 * error): no es un fallo del usuario, solo cambió lo pendiente. El resto sí
 * sale como `toast.error`. Invalida `["packings"]` (la lista del módulo).
 */
export const useCreatePacking = (onServerError?: (parsed: ParsedPackingError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPacking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packings"] });
      // OJO con la llave: `usePackingOnboarding` registra
      // `["packing-onboarding", pickingId]` (con guion). Una llave que no
      // coincida —p. ej. `["packingOnboarding"]`— NO lanza ningún error:
      // `invalidateQueries` simplemente no encuentra nada y resuelve en
      // silencio, dejando el catálogo del Paso 1 servido de caché hasta 15min
      // (usa el `staleTime` global a propósito, ver el hook).
      queryClient.invalidateQueries({ queryKey: ["packing-onboarding"] });
      toast.success("Packing registrado correctamente");
    },
    onError: (error) => {
      const parsed = parsePackingError(error);
      onServerError?.(parsed);

      if (parsed.staleData) {
        toast("Las cantidades pendientes cambiaron; se actualizaron los datos. Revisa y reintenta.", {
          icon: "🔄",
        });
        return;
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el packing";
      toast.error(toastMessage);
    },
  });
};
