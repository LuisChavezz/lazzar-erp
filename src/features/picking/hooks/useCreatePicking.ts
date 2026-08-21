import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createPicking } from "../services/actions";

/** Campos del encabezado que el backend puede señalar en un `400`. */
export type PickingFormErrorField =
  | "pedido"
  | "prioridad"
  | "tipo"
  | "observaciones";

const FORM_FIELDS: PickingFormErrorField[] = [
  "pedido",
  "prioridad",
  "tipo",
  "observaciones",
];

/**
 * Mensajes de "dato desactualizado": lo que se podía surtir cambió entre que se
 * cargó el formulario y se envió. Cubre las DOS causas, ambas ajenas al usuario
 * y ambas recuperables recargando:
 *
 *  - el PENDIENTE del pedido bajó (otro operador/otra pestaña ya surtió), y
 *  - la EXISTENCIA disponible del almacén origen bajó (otra reserva o
 *    movimiento de inventario consumió el stock), incluida la validación
 *    agregada que el backend hace cuando varias líneas comparten el mismo par
 *    producto/variante.
 *
 * NO son un error fatal: el Paso 2 recarga el onboarding y deja reintentar.
 */
const STALE_DATA_RE =
  /ya no tiene cantidad pendiente|excede lo pendiente|excede la existencia disponible/i;

/**
 * Rechazo DETERMINISTA que NO debe tratarse como dato desactualizado, aunque su
 * texto contenga la frase de arriba: el backend valida además la SUMA de las
 * líneas que comparten el mismo par (producto, variante) contra la existencia
 * agregada de esa clave, y ese mensaje dice "excede la existencia disponible
 * AGREGADA".
 *
 * Clasificarlo como stale sería una trampa sin salida: recargar devuelve los
 * mismos números (no cambió nada en el servidor), el usuario reenvía lo mismo y
 * vuelve a fallar, y encima el aviso genérico de stale reemplazaría al mensaje
 * real —el único que nombra el producto y el total excedido—. Tiene que llegar
 * al banner tal cual, para que el usuario sepa qué bajar.
 */
const DETERMINISTIC_STOCK_RE = /existencia disponible agregada/i;

/**
 * `picking_detalle` puede llegar en una TERCERA forma que `firstDrfMessage` no
 * cubre: si el rechazo ocurre a nivel de CAMPO del serializer anidado —p. ej.
 * `cantidad_asignada` bajo el `min_value=0.0001` o `pedido_detalle_talla` bajo
 * `min_value=1`, ambos validados por DRF antes de llegar al servicio—, la
 * respuesta es la forma estándar de un `ListSerializer`: un arreglo con UN
 * OBJETO POR LÍNEA enviada (`{}` si esa línea es válida, `{campo: ["msg"]}` si
 * no). Se busca el primer mensaje en esa forma anidada; si no la hay, cae al
 * comportamiento normal de `firstDrfMessage` (el string plano que arma el
 * servicio para sus propias validaciones).
 */
function firstPickingDetalleMessage(value: unknown): string | undefined {
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
 * Error de creación de picking, normalizado desde el contrato del backend.
 *
 * `operador` NO tiene campo visible en el formulario (se deriva de la sesión),
 * `almacen` tampoco (id fijo — ver `PRODUCTO_TERMINADO_ALMACEN_ID`),
 * `almacen_destino` sí lo tiene pero en el Paso 1 (ya desmontado cuando ocurre
 * el `POST`), y `picking_detalle` es un arreglo por talla sin un input único al
 * que atribuir el error: los cuatro se vuelcan a `formError`/`messages` (el
 * banner), no a `fieldErrors`, para que el usuario vea el motivo del rechazo.
 *
 * `staleData` marca los errores de pendiente desactualizado, que el Paso 2 trata
 * recargando datos en lugar de mostrar un error terminal.
 */
export interface ParsedPickingError {
  formError?: string;
  fieldErrors: Partial<Record<PickingFormErrorField, string>>;
  messages: string[];
  staleData: boolean;
}

/**
 * Normaliza el error de `POST /wms/pickings/`. Maneja las DOS formas del
 * contrato: arreglo plano (`["mensaje"]`, p. ej. validaciones de contexto o de
 * inventario) y objeto con clave (`{"picking_detalle": ["mensaje"]}` /
 * `{"pedido": [...]}`).
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de error siempre aparezca.
 */
export function parsePickingError(error: unknown): ParsedPickingError {
  const result: ParsedPickingError = {
    fieldErrors: {},
    messages: [],
    staleData: false,
  };

  const finalize = (): ParsedPickingError => {
    result.staleData =
      result.messages.some((message) => STALE_DATA_RE.test(message)) &&
      !result.messages.some((message) => DETERMINISTIC_STOCK_RE.test(message));
    return result;
  };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar el picking.";
    return finalize();
  }

  const data = error.response?.data;

  // Respuesta en texto plano (ej. 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return finalize();
  }

  // Forma 1: arreglo plano `["mensaje"]` (validaciones de contexto/inventario).
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar el picking.";
    }
    return finalize();
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar el picking.";
    return finalize();
  }

  // Forma 2: objeto con clave.
  const record = data as Record<string, unknown>;

  // ── Errores a nivel operación (banner, sin campo atribuible) ─────────────
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

  // `operador` no tiene campo en la UI — su error se trata como de operación.
  const operadorMessage = firstDrfMessage(record.operador);
  if (operadorMessage) {
    result.formError = result.formError ?? operadorMessage;
    result.messages.push(operadorMessage);
  }

  // `almacen` (origen) tampoco tiene campo en la UI (id fijo, ver
  // `PRODUCTO_TERMINADO_ALMACEN_ID`) — mismo trato.
  const almacenMessage = firstDrfMessage(record.almacen);
  if (almacenMessage) {
    result.formError = result.formError ?? almacenMessage;
    result.messages.push(almacenMessage);
  }

  // `almacen_destino` SÍ tiene selector, pero vive en el Paso 1 y el `POST` se
  // dispara desde el Paso 2: para cuando llega este error el input ya no está
  // en pantalla, así que atribuirlo a un campo no lo mostraría en ningún lado.
  // Va al banner del Paso 2, que es lo que el usuario está viendo.
  const almacenDestinoMessage = firstDrfMessage(record.almacen_destino);
  if (almacenDestinoMessage) {
    result.formError = result.formError ?? almacenDestinoMessage;
    result.messages.push(almacenDestinoMessage);
  }

  // `user`: la clave que usa el backend cuando el usuario autenticado no tiene
  // empresa asignada. Nunca es atribuible a un input.
  const userMessage = firstDrfMessage(record.user);
  if (userMessage) {
    result.formError = result.formError ?? userMessage;
    result.messages.push(userMessage);
  }

  // `picking_detalle` es el arreglo de líneas: aquí llegan los errores de
  // pendiente desactualizado, de línea ajena al pedido, de "al menos una
  // línea" y (vía `firstPickingDetalleMessage`) los de campo por línea que DRF
  // rechaza antes del servicio (cantidad/talla inválida). No hay un input
  // único; va al banner.
  const detalleMessage = firstPickingDetalleMessage(record.picking_detalle);
  if (detalleMessage) {
    result.formError = result.formError ?? detalleMessage;
    result.messages.push(detalleMessage);
  }

  // ── Errores de campo (atribuibles a un input del encabezado) ─────────────
  for (const field of FORM_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
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
      result.formError = "Error de validación al registrar el picking.";
    }
  }

  // Garantía final: si no hubo error de operación ni de campo pero sí un mensaje
  // suelto, se usa como motivo del banner.
  if (
    !result.formError &&
    Object.keys(result.fieldErrors).length === 0 &&
    result.messages.length > 0
  ) {
    result.formError = result.messages[0];
  }

  return finalize();
}

/**
 * Mutación para crear un picking parcial. `onServerError` recibe el error ya
 * normalizado para que el Paso 2 lo reparta entre el banner, los campos y —si
 * `staleData`— dispare la recarga del onboarding.
 *
 * Para los errores de dato desactualizado se usa un toast NEUTRO (no de error):
 * no es un fallo del usuario, solo cambiaron los pendientes. El resto sí sale
 * como `toast.error`. Invalida `["pickings"]` (la lista del módulo).
 */
export const useCreatePicking = (onServerError?: (parsed: ParsedPickingError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPicking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickings"] });
      toast.success("Picking registrado correctamente");
    },
    onError: (error) => {
      const parsed = parsePickingError(error);
      onServerError?.(parsed);

      if (parsed.staleData) {
        toast("Las cantidades disponibles cambiaron; se actualizaron los datos. Revisa y reintenta.", {
          icon: "🔄",
        });
        return;
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el picking";
      toast.error(toastMessage);
    },
  });
};
