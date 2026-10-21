import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { parseLineItemsDrfError, type ParsedLineItemsError } from "@/src/utils/parseLineItemsDrfError";
import { createCobro } from "../services/actions";
import { invalidateCobroEffects } from "./cobroQueryCache";
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

/** Error de alta de cobro normalizado (ver `ParsedLineItemsError`). */
export type ParsedCobroError = ParsedLineItemsError<CobroHeaderErrorField>;

/**
 * Normaliza el error de `POST /finanzas/cobros/` con el parser compartido de
 * documentos con líneas. Lo propio de cobros:
 *  - `cobro_detalles` hecho solo de strings son errores de NEGOCIO del servicio
 *    ("Importe 60 excede saldo 50 de la CxC 15."), no de la primera línea:
 *    hablan de UNA CxC por su id y se asignan a la línea con ese `cxc` (si no
 *    se encuentra, al banner);
 *  - `estatus`, `empresa` y los errores de póliza van al banner.
 *
 * `cxcIds` son los `cxc` enviados, en el orden de las líneas.
 */
export function parseCobroError(error: unknown, cxcIds: readonly number[]): ParsedCobroError {
  return parseLineItemsDrfError(error, {
    linesKey: "cobro_detalles",
    headerFields: HEADER_FIELDS,
    formLevelKeys: FORM_LEVEL_KEYS,
    genericMessage: "Error al registrar el cobro.",
    validationMessage: "Error de validación al registrar el cobro.",
    wholeArrayStringsAreUnindexed: true,
    resolveUnindexedLine: (message) => {
      const match = CXC_ID_IN_MESSAGE_RE.exec(message);
      return match ? cxcIds.indexOf(Number(match[1])) : -1;
    },
  });
}

/**
 * Mutación de alta de cobro. `onServerError` recibe el error ya normalizado.
 *
 * Al aplicarse, el cobro baja el saldo de cada CxC (y su estatus), sube el saldo
 * de la cuenta bancaria, crea un movimiento bancario, puede generar póliza y
 * mueve el `cobrado_pct` de la trazabilidad del pedido. Se invalida por PREFIJO
 * todo lo que muestra esos datos (`invalidateCobroEffects`).
 */
export const useCreateCobro = (onServerError?: (parsed: ParsedCobroError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCobroPayload) => createCobro(payload),
    onSuccess: () => {
      invalidateCobroEffects(queryClient);
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
