import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { parseLineItemsDrfError, type ParsedLineItemsError } from "@/src/utils/parseLineItemsDrfError";
import { createPago } from "../services/actions";

/** Campos de cabecera que el backend puede señalar en un `400`. */
export type PagoHeaderErrorField =
  | "proveedor"
  | "cuenta_bancaria"
  | "fecha_pago"
  | "metodo_pago"
  | "referencia"
  | "referencia_operacion"
  | "observaciones"
  // El cuadre `|suma − total_pagado| <= 0.01` lo reporta el backend en ESTA
  // llave, no en `pago_detalles`: es un error de CABECERA aunque su causa esté
  // repartida entre las líneas.
  | "total_pagado";

/**
 * Error de alta de pago normalizado (ver `ParsedLineItemsError`): banner de
 * "todo o nada", errores de cabecera (incluido el cuadre en `total_pagado`) y
 * errores por línea indexados por posición.
 */
export type ParsedPagoError = ParsedLineItemsError<PagoHeaderErrorField>;

const HEADER_FIELDS: PagoHeaderErrorField[] = [
  "proveedor",
  "cuenta_bancaria",
  "fecha_pago",
  "metodo_pago",
  "referencia",
  "referencia_operacion",
  "observaciones",
  "total_pagado",
];

/**
 * Normaliza el error de `POST /finanzas/pagos/` con el parser compartido de
 * documentos con líneas. Pagos conserva su reparto de siempre: una lista de
 * strings en `pago_detalles` se pinta por POSICIÓN (cada string en su línea), y
 * un string suelto va al banner.
 */
export function parsePagoError(error: unknown): ParsedPagoError {
  return parseLineItemsDrfError(error, {
    linesKey: "pago_detalles",
    headerFields: HEADER_FIELDS,
    genericMessage: "Error al registrar el pago.",
    validationMessage: "Error de validación al registrar el pago.",
  });
}

/**
 * Mutación de alta de pago. `onServerError` recibe el error ya normalizado para
 * que el formulario lo reparta entre el banner de "todo o nada", los campos de
 * cabecera y las líneas.
 *
 * Invalida `["pagos"]` (el listado) y `["cuentas-por-pagar"]` por PREFIJO: al
 * aplicarse, el pago baja el saldo de cada CxP y puede marcarlas `Pagada`, así
 * que las listas por proveedor que el selector haya cacheado quedan obsoletas.
 */
export const useCreatePago = (
  onServerError?: (parsed: ParsedPagoError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] });
      toast.success("Pago registrado correctamente");
    },
    onError: (error) => {
      const parsed = parsePagoError(error);
      onServerError?.(parsed);

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el pago";
      toast.error(toastMessage);
    },
  });
};
