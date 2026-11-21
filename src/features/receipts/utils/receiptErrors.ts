import { isAxiosError } from "axios";
import { firstNestedDrfMessage } from "@/src/utils/firstDrfMessage";
import type { ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";

/**
 * ¿El backend rechazó la SM de la recepción? 400 con la llave `salida_maquila`
 * (SM ya recibida, cancelada, inexistente o de otra OP; nucleo-erp #1217). La
 * SM elegida dejó de ser recibible: el flujo vuelve al paso 1 (EC-912). Los
 * demás 400 dejan al usuario en el formulario para corregir.
 */
export const isSalidaMaquilaRejection = (error: unknown): boolean => {
  if (!isAxiosError(error) || error.response?.status !== 400) return false;
  const data: unknown = error.response.data;
  return !!data && typeof data === "object" && "salida_maquila" in data;
};

/**
 * Id del renglón de la orden (o de la SM de OB/OR) de cada renglón del POST, en
 * el MISMO orden en que viajan: el backend nombra un renglón por su posición en
 * el payload (`#N`, 1 = el primero).
 */
export const receiptPayloadLineIds = (payload: ReceiptCreatePayload): number[] =>
  payload.detalle.map((d) =>
    "orden_compra_detalle" in d
      ? d.orden_compra_detalle
      : "orden_produccion_detalle" in d
        ? d.orden_produccion_detalle
        : d.salida_maquila_detalle,
  );

/**
 * "El renglón #2 (orden_produccion_detalle 40, SKU X) excede…" → "Excede…": la
 * referencia sobra junto al renglón (y su id interno no le dice nada a nadie).
 * Un mensaje que no empieza así se deja igual.
 */
const sinReferencia = (message: string): string => {
  const rest = message.replace(/^El renglón #\d+(?: \([^)]*\))?\s*/, "");
  if (rest === message || !rest) return message;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

export interface ReceiptLineErrors {
  /** Mensaje por id de renglón (el `id` del renglón del formulario). */
  porRenglon: Record<number, string>;
  /** `true` si TODO el 400 se pudo repartir en renglones (no hace falta toast). */
  completo: boolean;
}

/**
 * Reparte el 400 del alta de recepción entre sus renglones (EC-919).
 *
 * El onboarding manda los errores de renglón en `detalle`, siempre en lista
 * (nucleo-erp #1189), con la posición del renglón en el payload: "El renglón
 * #N …" o "La variante del renglón #N …". Si el serializer rechaza el formato
 * del renglón, `detalle` es una lista de objetos por posición. Lo que no se
 * pueda ubicar (otra llave, o un mensaje sin `#N` como "La recepción debe tener
 * al menos un renglón…") queda fuera y `completo` es `false`: el toast lo dice.
 */
export const receiptLineErrors = (error: unknown, lineIds: readonly number[]): ReceiptLineErrors => {
  const vacio = { porRenglon: {}, completo: false };
  if (!isAxiosError(error) || error.response?.status !== 400) return vacio;
  const data: unknown = error.response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return vacio;

  const porRenglon: Record<number, string> = {};
  let sinUbicar = Object.keys(data).some((key) => key !== "detalle");
  const raw = (data as Record<string, unknown>).detalle;
  const items = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];

  items.forEach((item, index) => {
    if (typeof item === "string") {
      const match = /renglón #(\d+)/.exec(item);
      const id = match ? lineIds[Number(match[1]) - 1] : undefined;
      if (id === undefined) sinUbicar = true;
      else porRenglon[id] ??= sinReferencia(item);
      return;
    }
    // Error del serializer por posición: `[{cantidad_recibida: [...]}, {}]`.
    const message = firstNestedDrfMessage(item);
    if (!message) return;
    const id = lineIds[index];
    if (id === undefined) sinUbicar = true;
    else porRenglon[id] ??= message;
  });

  return { porRenglon, completo: !sinUbicar && Object.keys(porRenglon).length > 0 };
};
