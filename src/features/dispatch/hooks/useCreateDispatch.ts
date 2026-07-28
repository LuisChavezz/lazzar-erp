import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createDispatch } from "../services/actions";

/**
 * Mensajes de "dato desactualizado": la línea ya se despachó entre que se
 * cargó el formulario y se envió (otro despacho la consumió). NO es un error
 * fatal — el formulario recarga el onboarding, la línea reaparece marcada
 * como "Ya despachada" y se puede reintentar con el resto. Mismo criterio que
 * `STALE_DATA_RE` en `useCreatePacking`/`useCreatePicking`.
 *
 * Solo cubre "ya fue despachado". "No pertenecen al packing seleccionado" NO
 * entra aquí: no es una carrera entre operadores sino una incongruencia entre
 * lo enviado y el packing elegido, que merece un error visible.
 */
const STALE_DATA_RE = /ya fue despachad/i;

/**
 * `despacho_detalle` puede llegar en TRES formas distintas (confirmado contra
 * el backend — una más que packing):
 *
 *  1. Arreglo de strings a nivel de campo del serializer, p. ej.
 *     `["This field is required."]`.
 *  2. STRING plano (no arreglo) para los rechazos del servicio
 *     (`_resolve_requested_rows`): `"Debe enviar al menos una línea para
 *     despachar."`, `"Los siguientes packing_detalle no pertenecen al packing
 *     seleccionado: [88, 91]"`, `"El packing_detalle 21 ya fue despachado."`.
 *  3. Arreglo con UN OBJETO POR LÍNEA enviada (forma estándar de un
 *     `ListSerializer` cuando el rechazo es de un CAMPO dentro de una línea):
 *     `[{"packing_detalle": ["This field is required."]}, {}]` — indexado por
 *     posición, con `{}` en las líneas válidas.
 *
 * `firstDrfMessage` ya resuelve (1) y (2) —acepta string y arreglo de
 * strings—; esta función agrega (3), recorriendo las posiciones hasta dar con
 * la primera que sí trae un mensaje y saltando los `{}` intermedios. En la
 * práctica (3) es defensiva: la UI arma las líneas desde casillas sobre filas
 * del propio onboarding, así que `packing_detalle` nunca puede faltar ni ser
 * menor a 1.
 */
function firstDespachoDetalleMessage(value: unknown): string | undefined {
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
 * Error de creación de despacho, normalizado desde el contrato del backend.
 *
 * Sin `fieldErrors`: el formulario no tiene inputs a los que atribuir un
 * error (el packing se elige en una lista buscable y las líneas son casillas),
 * así que todo mensaje va al banner.
 *
 * `staleData` marca el caso de línea ya despachada, que el formulario trata
 * recargando datos en lugar de mostrar un error terminal.
 */
export interface ParsedDispatchError {
  formError?: string;
  messages: string[];
  staleData: boolean;
}

/**
 * Normaliza el error de `POST /wms/despachos/`. Cubre las TRES formas del
 * contrato:
 *
 *  A. Arreglo plano a nivel RAÍZ (`["mensaje"]`) — validaciones de contexto
 *     de `_validate_context`: empresa no asignada, packing de otra empresa,
 *     packing cancelado, sin acceso a la sucursal.
 *  B. Objeto con clave y ARREGLO de strings (DRF estándar):
 *     `{"packing": ["This field is required."]}`, o `despacho_detalle` con un
 *     objeto por posición.
 *  C. Objeto con clave y STRING plano (rechazos de servicio):
 *     `{"despacho_detalle": "Debe enviar al menos una línea para despachar."}`.
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner siempre aparezca.
 */
export function parseDispatchError(error: unknown): ParsedDispatchError {
  const result: ParsedDispatchError = {
    messages: [],
    staleData: false,
  };

  const finalize = (): ParsedDispatchError => {
    result.staleData = result.messages.some((message) => STALE_DATA_RE.test(message));
    return result;
  };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar el despacho.";
    return finalize();
  }

  const data = error.response?.data;

  // Respuesta en texto plano (ej. un 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return finalize();
  }

  // Forma A: arreglo plano a nivel raíz.
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar el despacho.";
    }
    return finalize();
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar el despacho.";
    return finalize();
  }

  // Formas B y C: objeto con clave. `firstDrfMessage` no distingue entre un
  // string plano y un arreglo de strings, así que ambas se leen igual desde
  // aquí; solo `despacho_detalle` necesita el paso extra de la forma (3).
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

  // `packing` no tiene slot de error propio (se eligió de una lista ya
  // cargada) — se trata como error de operación, al banner.
  const packingMessage = firstDrfMessage(record.packing);
  if (packingMessage) {
    result.formError = result.formError ?? packingMessage;
    result.messages.push(packingMessage);
  }

  // `despacho_detalle` concentra los errores de línea: dato desactualizado,
  // línea ajena al packing, "al menos una línea" y —vía
  // `firstDespachoDetalleMessage`— los de campo por posición.
  const detalleMessage = firstDespachoDetalleMessage(record.despacho_detalle);
  if (detalleMessage) {
    result.formError = result.formError ?? detalleMessage;
    result.messages.push(detalleMessage);
  }

  // Fallback: cualquier otra clave desconocida contribuye al banner/toast.
  if (result.messages.length === 0) {
    Object.values(record).forEach((value) => {
      const message = firstDespachoDetalleMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = "Error de validación al registrar el despacho.";
    }
  }

  if (!result.formError && result.messages.length > 0) {
    result.formError = result.messages[0];
  }

  return finalize();
}

/**
 * Mutación para crear un despacho. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner y —si
 * `staleData`— dispare la recarga del onboarding.
 *
 * Para el dato desactualizado se usa un toast NEUTRO (no de error): no es un
 * fallo del usuario, solo cambió la elegibilidad de una línea. Invalida
 * `["dispatches"]` (el listado) y `["dispatch-onboarding"]` (el catálogo y
 * cualquier alcance por packing: despachar líneas cambia su elegibilidad).
 */
export const useCreateDispatch = (onServerError?: (parsed: ParsedDispatchError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDispatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-onboarding"] });
      toast.success("Despacho registrado correctamente");
    },
    onError: (error) => {
      const parsed = parseDispatchError(error);
      onServerError?.(parsed);

      if (parsed.staleData) {
        toast("Alguna línea ya había sido despachada; se actualizaron los datos. Revisa y reintenta.", {
          icon: "🔄",
        });
        return;
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el despacho";
      toast.error(toastMessage);
    },
  });
};
