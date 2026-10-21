import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { isWholeArrayDrfError } from "@/src/utils/isWholeArrayDrfError";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { createCobro } from "../services/actions";
import type { CreateCobroPayload } from "../interfaces/collection.interface";

/** Campos de cabecera que el backend puede señalar en un `400`. */
export type CobroHeaderErrorField =
  | "cliente"
  | "cuenta_bancaria"
  | "fecha_cobro"
  | "metodo_pago"
  | "referencia"
  | "referencia_operacion"
  | "observaciones"
  // El cuadre `|suma − total_cobrado| <= 0.01` llega en ESTA llave: es un error
  // de cabecera aunque su causa esté repartida entre las líneas.
  | "total_cobrado";

const HEADER_FIELDS: CobroHeaderErrorField[] = [
  "cliente",
  "cuenta_bancaria",
  "fecha_cobro",
  "metodo_pago",
  "referencia",
  "referencia_operacion",
  "observaciones",
  "total_cobrado",
];

/**
 * Llaves del cuerpo que no corresponden a ningún campo del formulario y van al
 * banner: `estatus` / `empresa` (de `perform_create`) y las de la póliza que el
 * alta genera al aplicar con la contabilidad encendida (configuración contable
 * incompleta → 400 y no se guarda nada).
 */
const FORM_LEVEL_KEYS = [
  "detail",
  "non_field_errors",
  "estatus",
  "empresa",
  "cuenta_contable",
  "configuracion_contable",
  "sucursal",
  "poliza_detalles",
] as const;

/** "La CxC 15 …" / "… de la CxC 15." / "CxC 15 no encontrada." → 15. */
const CXC_ID_IN_MESSAGE_RE = /\bCxC (\d+)\b/;

/**
 * Error de alta de cobro, normalizado para que el formulario lo pinte:
 *  - `formError`   → banner de "todo o nada";
 *  - `fieldErrors` → bajo un campo de cabecera (incluido `total_cobrado`);
 *  - `lineErrors`  → por línea, indexado por posición; `_form` guarda un error
 *                    de línea no atribuible a un campo.
 * `messages` es la lista plana para el toast.
 */
export interface ParsedCobroError {
  formError?: string;
  fieldErrors: Partial<Record<CobroHeaderErrorField, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

/**
 * Normaliza el error de `POST /finanzas/cobros/`. Los valores pueden llegar como
 * `string` o `string[]` según dónde se lanzaron (serializer, servicio o
 * `perform_create`), y `cobro_detalles` en dos formas:
 *  - lista alineada por índice (`[{}, {"cxc": ["…"]}]`), del serializer;
 *  - lista de strings o string suelto, de los errores de negocio del servicio
 *    ("Importe 60 excede saldo 50 de la CxC 15."): hablan de UNA CxC por su id,
 *    así que se asignan a la línea con ese `cxc` y, si no se encuentra, al
 *    banner.
 * Un 409 por choque de bloqueos llega como lista de nivel superior.
 *
 * `cxcIds` son los `cxc` enviados, en el orden de las líneas. Siempre devuelve
 * un objeto: ante un error inesperado deja un `formError` genérico.
 */
export function parseCobroError(error: unknown, cxcIds: readonly number[]): ParsedCobroError {
  const result: ParsedCobroError = { fieldErrors: {}, lineErrors: {}, messages: [] };

  const pushLineError = (index: number, field: string, message: string) => {
    if (!result.lineErrors[index]) result.lineErrors[index] = {};
    result.lineErrors[index][field] = message;
    result.messages.push(`Línea ${index + 1}: ${message}`);
  };

  const pushFormMessage = (message: string) => {
    result.formError = result.formError ?? message;
    result.messages.push(message);
  };

  /** Mensaje de negocio sobre una CxC: a su línea si el id la identifica. */
  const pushCxcMessage = (message: string) => {
    const match = CXC_ID_IN_MESSAGE_RE.exec(message);
    const index = match ? cxcIds.indexOf(Number(match[1])) : -1;
    if (index >= 0) {
      pushLineError(index, "_form", message);
    } else {
      pushFormMessage(message);
    }
  };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar el cobro.";
    return result;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim().length > 0) {
    pushFormMessage(data);
    return result;
  }

  // Lista de nivel superior: `raise ValidationError("…")` y el 409 de bloqueos.
  if (Array.isArray(data)) {
    data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message))
      .forEach(pushFormMessage);
    if (!result.formError) result.formError = "Error al registrar el cobro.";
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar el cobro.";
    return result;
  }

  const record = data as Record<string, unknown>;

  for (const key of FORM_LEVEL_KEYS) {
    const message = firstDrfMessage(record[key]);
    if (message) pushFormMessage(message);
  }

  for (const field of HEADER_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  const detalles = record.cobro_detalles;
  if (typeof detalles === "string" && detalles.length > 0) {
    pushCxcMessage(detalles);
  } else if (Array.isArray(detalles)) {
    if (isWholeArrayDrfError(detalles)) {
      detalles
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
        .forEach(pushCxcMessage);
    } else {
      detalles.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        Object.entries(entry as Record<string, unknown>).forEach(([lineField, lineValue]) => {
          const message = firstDrfMessage(lineValue);
          if (!message) return;
          pushLineError(index, lineField === "non_field_errors" ? "_form" : lineField, message);
        });
      });
    }
  }

  // Cualquier otra llave desconocida: al toast y, si no hubo nada más, al banner.
  if (result.messages.length === 0) {
    Object.entries(record).forEach(([key, value]) => {
      if (key === "cobro_detalles") return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
  }
  if (
    !result.formError &&
    Object.keys(result.fieldErrors).length === 0 &&
    Object.keys(result.lineErrors).length === 0
  ) {
    result.formError = result.messages[0] ?? "Error de validación al registrar el cobro.";
  }

  return result;
}

/**
 * Mutación de alta de cobro. `onServerError` recibe el error ya normalizado.
 *
 * Al aplicarse, el cobro baja el saldo de cada CxC (y su estatus), sube el saldo
 * de la cuenta bancaria, crea un movimiento bancario, puede generar póliza y
 * mueve el `cobrado_pct` de la trazabilidad del pedido. Se invalida por PREFIJO
 * todo lo que muestra esos datos.
 */
export const useCreateCobro = (onServerError?: (parsed: ParsedCobroError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCobroPayload) => createCobro(payload),
    onSuccess: () => {
      [
        ["cobros"],
        ["finance-dashboard"],
        ["accounts-receivable"],
        ["accounts-receivable-detail"],
        ["bank-accounts"],
        ["bank-account-summary"],
        ["polizas"],
        ["invoice-desglose"],
        ["customer"],
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      invalidatePedidoProgress(queryClient);
      toast.success("Cobro registrado correctamente");
    },
    onError: (error, payload) => {
      const parsed = parseCobroError(
        error,
        payload.cobro_detalles.map((line) => line.cxc),
      );
      onServerError?.(parsed);
      // Un error de líneas o de saldo puede deberse a saldos que cambiaron por
      // debajo (otro cobro sobre la misma CxC): se vuelven a pedir las CxC para
      // que las líneas muestren y validen contra el saldo vigente.
      const touchesLines =
        Object.keys(parsed.lineErrors).length > 0 ||
        parsed.messages.some((message) => /saldo/i.test(message)) ||
        (error instanceof AxiosError &&
          typeof error.response?.data === "object" &&
          error.response?.data !== null &&
          "cobro_detalles" in error.response.data);
      if (touchesLines) {
        queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      }
      toast.error(
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el cobro",
      );
    },
  });
};
