import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { registrarRfidLabelImpresion } from "../services/actions";

/** Clasificación del rechazo, para que la UI pueda resaltar los dos casos
 *  conocidos además de mostrar el mensaje. */
export type RfidRegisterErrorKind = "epc" | "sucursal" | "generic";

export interface ParsedRfidRegisterError {
  kind: RfidRegisterErrorKind;
  message: string;
}

const SUCURSAL_RE = /sucursal/i;
const EPC_RE = /epc/i;

/**
 * Normaliza el error de `POST /onboarding/` a un mensaje claro. Los dos rechazos
 * conocidos llegan en formas distintas del backend:
 *
 *  - EPC duplicado: 409 con `{ detail }` (carrera en `store_impresion`) o 400
 *    con `{ etiquetas: [...] }` (pre-chequeo del serializer).
 *  - Sucursal faltante: 400 como arreglo plano `["El usuario no tiene una
 *    sucursal asignada..."]` (DRF `ValidationError` con string), que también
 *    puede caer en `non_field_errors`.
 *
 * Se cubre además la forma `{ error }` (que usa el GET del onboarding) y los
 * errores de campo estándar de DRF, con un fallback genérico que nunca deja el
 * mensaje vacío.
 */
export function parseRfidRegisterError(error: unknown): ParsedRfidRegisterError {
  const wrap = (message: string): ParsedRfidRegisterError => {
    if (EPC_RE.test(message)) return { kind: "epc", message };
    if (SUCURSAL_RE.test(message)) return { kind: "sucursal", message };
    return { kind: "generic", message };
  };

  if (!(error instanceof AxiosError)) {
    return { kind: "generic", message: "No se pudo registrar la impresión." };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (typeof data === "string" && data.trim().length > 0) {
    return wrap(data);
  }

  // Arreglo plano `["mensaje"]` — así llega la sucursal faltante.
  if (Array.isArray(data)) {
    const message = firstDrfMessage(data);
    if (message) return wrap(message);
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    // Orden de prioridad: EPC (etiquetas/detail) antes que campos genéricos.
    const message =
      firstDrfMessage(record.etiquetas) ??
      firstDrfMessage(record.detail) ??
      firstDrfMessage(record.non_field_errors) ??
      (typeof record.error === "string" ? record.error : firstDrfMessage(record.error)) ??
      firstDrfMessage(record.producto_variante) ??
      firstDrfMessage(record.producto) ??
      firstDrfMessage(record.cantidad);
    if (message) {
      // El 409 SIEMPRE es colisión de EPC aunque el texto no diga "epc".
      if (status === 409) return { kind: "epc", message };
      return wrap(message);
    }
  }

  if (status === 409) {
    return {
      kind: "epc",
      message: "Uno o más códigos EPC ya están registrados.",
    };
  }

  return { kind: "generic", message: "No se pudo registrar la impresión." };
}

/**
 * Registra la impresión (`POST /onboarding/`). Al tener éxito invalida DOS
 * cachés:
 *
 *  - `["etiquetas-rfid"]` (el historial) para que el nuevo evento aparezca de
 *    inmediato.
 *  - `["etiquetas-rfid-onboarding"]` (el preview) porque al registrar se
 *    PERSISTEN los EPCs de ese preview: reusarlos en otra impresión chocaría
 *    con el índice único de EPC (400/409). Invalidar fuerza a regenerar EPCs
 *    frescos en la siguiente vista previa —clave para reintentar tras un fallo
 *    parcial y para una segunda impresión del mismo SKU/cantidad—.
 *
 * NO emite toast: el consumidor decide el mensaje según el resultado REAL de la
 * impresión (éxito total vs. registrada con fallo), y captura el error vía
 * `mutateAsync` para clasificarlo con `parseRfidRegisterError`.
 */
export const useRegisterRfidLabel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registrarRfidLabelImpresion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etiquetas-rfid"] });
      queryClient.invalidateQueries({ queryKey: ["etiquetas-rfid-onboarding"] });
    },
  });
};
