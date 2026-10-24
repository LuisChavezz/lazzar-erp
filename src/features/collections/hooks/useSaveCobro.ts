import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { parseLineItemsDrfError, type ParsedLineItemsError } from "@/src/utils/parseLineItemsDrfError";
import { createCobro, updateCobro } from "../services/actions";
import { cobroLabel } from "../utils/collection.utils";
import { COBRO_DRAFT_INACTIVE_ACCOUNT_MESSAGE, COBRO_DRAFT_INACTIVE_CLIENT_MESSAGE } from "../utils/cobroDraft";
import { invalidateCobroEffects, writeCobroToList } from "./cobroQueryCache";
import type { CreateCobroPayload } from "../interfaces/collection.interface";

/** Campos de cabecera que el backend puede señalar en un `400`. */
export type CobroHeaderErrorField =
  | "cliente"
  | "cuenta_bancaria"
  | "fecha_cobro"
  | "tipo_cambio"
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
  "tipo_cambio",
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

/** Mensaje de DRF para un FK fuera del queryset del campo (en español o inglés). */
const DOES_NOT_EXIST_RE = /objeto no existe|does not exist/i;

/** "La CxC 15 …" / "… de la CxC 15." / "CxC 15 no encontrada." → 15. */
const CXC_ID_IN_MESSAGE_RE = /\bCxC (\d+)\b/;

/** Error de alta de cobro normalizado (ver `ParsedLineItemsError`). */
export type ParsedCobroError = ParsedLineItemsError<CobroHeaderErrorField>;

/**
 * Normaliza el error de `POST /finanzas/cobros/` o de `PATCH
 * /finanzas/cobros/{id}/` con el parser compartido de documentos con líneas. Lo
 * propio de cobros:
 *  - `cobro_detalles` hecho solo de strings son errores de NEGOCIO del servicio
 *    ("Importe 60 excede saldo 50 de la CxC 15."), no de la primera línea:
 *    hablan de UNA CxC por su id y se asignan a la línea con ese `cxc` (si no
 *    se encuentra, al banner, como "Las líneas solo se editan mientras el cobro
 *    es Borrador.");
 *  - `estatus`, `empresa` y los errores de póliza van al banner.
 *
 *  - un `cliente` o `cuenta_bancaria` que "no existe" (el serializer solo
 *    acepta activos, así que un borrador cuyo cliente o cuenta se desactivó
 *    llega así) se explica con el aviso de inactivo en vez del texto de DRF.
 *
 * `cxcIds` son los `cxc` enviados, en el orden de las líneas. `isUpdate` solo
 * cambia el texto genérico.
 */
export function parseCobroError(
  error: unknown,
  cxcIds: readonly number[],
  { isUpdate = false }: { isUpdate?: boolean } = {},
): ParsedCobroError {
  const verb = isUpdate ? "guardar" : "registrar";
  const parsed = parseLineItemsDrfError(error, {
    linesKey: "cobro_detalles",
    headerFields: HEADER_FIELDS,
    formLevelKeys: FORM_LEVEL_KEYS,
    genericMessage: `Error al ${verb} el cobro.`,
    validationMessage: `Error de validación al ${verb} el cobro.`,
    wholeArrayStringsAreUnindexed: true,
    resolveUnindexedLine: (message) => {
      const match = CXC_ID_IN_MESSAGE_RE.exec(message);
      return match ? cxcIds.indexOf(Number(match[1])) : -1;
    },
  });

  // "Clave primaria inválida - objeto no existe" de DRF: el FK ya no es elegible.
  const inactiveMessages: Partial<Record<CobroHeaderErrorField, string>> = {
    cliente: COBRO_DRAFT_INACTIVE_CLIENT_MESSAGE,
    cuenta_bancaria: COBRO_DRAFT_INACTIVE_ACCOUNT_MESSAGE,
  };
  for (const [field, friendly] of Object.entries(inactiveMessages) as [CobroHeaderErrorField, string][]) {
    const raw = parsed.fieldErrors[field];
    if (raw && DOES_NOT_EXIST_RE.test(raw)) {
      parsed.fieldErrors[field] = friendly;
      parsed.messages = parsed.messages.map((message) => (message === raw ? friendly : message));
    }
  }
  return parsed;
}

/** Guardado de un cobro: alta (`cobroId` ausente) o edición de un borrador. */
interface SaveCobroVariables {
  payload: CreateCobroPayload;
  /** Borrador a editar (`PATCH`); sin él, alta (`POST`). */
  cobroId?: number;
}

/**
 * Mutación de alta de cobro y de edición de un borrador. `onServerError` recibe
 * el error ya normalizado.
 *
 * - Un `Borrador` (alta o edición) no mueve nada: solo cambia el listado de
 *   cobros (y la sección "Cobros" del detalle de CxC, que lo lee del mismo
 *   caché), así que solo se invalida `["cobros"]`.
 * - Al aplicarse (alta `Aplicado` o PATCH con `estatus: "Aplicado"`), el cobro
 *   baja el saldo de cada CxC (y su estatus), sube el saldo de la cuenta
 *   bancaria, crea un movimiento bancario, puede generar póliza y mueve el
 *   `cobrado_pct` de la trazabilidad del pedido. Se invalida por PREFIJO todo lo
 *   que muestra esos datos (`invalidateCobroEffects`).
 *
 * La respuesta del PATCH se escribe en el listado antes del refetch, para que
 * el detalle refleje el borrador vigente aunque el refetch tarde o falle. Tras
 * un error de edición se relee el listado: un 400 puede deberse a que el cobro
 * dejó de ser Borrador en otra pestaña.
 */
export const useSaveCobro = (onServerError?: (parsed: ParsedCobroError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, cobroId }: SaveCobroVariables) =>
      cobroId === undefined ? createCobro(payload) : updateCobro(cobroId, payload),
    onSuccess: (cobro, { cobroId }) => {
      const label = cobroLabel(cobro);
      if (cobroId !== undefined) writeCobroToList(queryClient, cobro);
      if (cobro.estatus === "Aplicado") {
        invalidateCobroEffects(queryClient);
        toast.success(cobroId === undefined ? "Cobro registrado correctamente" : `Cobro ${label} aplicado`);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["cobros"] });
        toast.success(`Borrador ${label} guardado`);
      }
    },
    onError: (error, { payload, cobroId }) => {
      const isUpdate = cobroId !== undefined;
      const parsed = parseCobroError(
        error,
        payload.cobro_detalles.map((line) => line.cxc),
        { isUpdate },
      );
      onServerError?.(parsed);
      if (isUpdate) void queryClient.invalidateQueries({ queryKey: ["cobros"] });
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
          : parsed.formError ?? `Error al ${isUpdate ? "guardar" : "registrar"} el cobro`,
      );
    },
  });
};
