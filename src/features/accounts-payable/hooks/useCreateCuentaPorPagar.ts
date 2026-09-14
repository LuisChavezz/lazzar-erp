import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createCuentaPorPagar } from "../services/actions";
import {
  parseCuentaPorPagarError,
  type ParsedCuentaPorPagarError,
} from "../utils/parseCuentaPorPagarError";

/**
 * useCreateCuentaPorPagar
 *
 * Mutación de alta manual (`POST /finanzas/cuentas-por-pagar/`). Estándar, no
 * optimista —mismo molde que `useCreatePago`—: la cuenta creada trae valores que
 * decide el servidor (`id`, `saldo`, `estatus`, `fecha_emision`, el vencimiento
 * copiado de la factura), así que no hay fila optimista honesta que pintar.
 *
 * `onServerError` recibe el error ya normalizado para que el formulario lo
 * reparta entre el banner y los campos; su `kind` distingue un 400 (corregir)
 * de un 409 (reintentar).
 *
 * Invalida `["cuentas-por-pagar"]` por PREFIJO: refresca el listado de CxP y, de
 * paso, los selectores de CxP que `payments` haya cacheado por proveedor, donde
 * la cuenta nueva también debe aparecer.
 */
export const useCreateCuentaPorPagar = (
  onServerError?: (parsed: ParsedCuentaPorPagarError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCuentaPorPagar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] });
      toast.success("Cuenta por pagar registrada correctamente");
    },
    onError: (error) => {
      // También en el fallo: el selector excluye las facturas que ya tienen CxP
      // usando este listado, y un 400 de duplicado significa justo que estaba
      // rancio (otra pantalla generó la CxP). Sin refrescarlo, la misma factura
      // seguiría ofreciéndose y fallando igual. No toca el formulario abierto.
      void queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] });

      const parsed = parseCuentaPorPagarError(error);
      onServerError?.(parsed);

      toast.error(
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar la cuenta por pagar",
      );
    },
  });
};
