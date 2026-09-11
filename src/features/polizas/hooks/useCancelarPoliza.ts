import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cancelarPoliza } from "../services/actions";
import { parsePolizaError, polizaErrorToastMessage } from "../utils/parsePolizaError";
import type { Poliza } from "../interfaces/poliza.interface";

const FALLBACK = "Error al cancelar la póliza";

/**
 * Cancela una póliza: `POST /finanzas/polizas/{id}/cancelar/`.
 *
 * ES LA ÚNICA VÍA. Nunca un `PATCH { estatus: "Cancelada" }`: aunque cancelar no
 * tenga precondiciones que validar, escribir `estatus` por PATCH es el mismo
 * camino que contabilizaría una póliza descuadrada, y este módulo no lo usa en
 * ningún caso.
 *
 * Mismo molde que `useCancelNotaCredito`: optimismo de cambio de ESTATUS (no de
 * borrado) — cancelar → instantánea → marcar la fila → revertir en `onError` →
 * invalidar en `onSettled`. Aquí el optimismo es especialmente seguro:
 * `PolizaService.cancelar` es idempotente, no tiene precondiciones (acepta tanto
 * `Borrador` como `Contabilizada`) y NO revierte importes —la póliza ES el
 * asiento, no hay saldo que devolver, a diferencia de cancelar un pago o una
 * nota de crédito—.
 *
 * El registro NUNCA sale del listado: solo cambia su `estatus` a `Cancelada`,
 * por eso el optimista MARCA la fila en vez de filtrarla.
 */
export const useCancelarPoliza = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelarPoliza(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["polizas"] });
      const previousPolizas = queryClient.getQueryData<Poliza[]>(["polizas"]);

      if (previousPolizas) {
        queryClient.setQueryData<Poliza[]>(["polizas"], (old) =>
          old
            ? old.map((poliza) =>
                poliza.id === id
                  ? { ...poliza, estatus: "Cancelada" as const }
                  : poliza,
              )
            : [],
        );
      }

      return { previousPolizas };
    },
    onError: (error, _id, context) => {
      if (context?.previousPolizas) {
        queryClient.setQueryData(["polizas"], context.previousPolizas);
      }
      console.error(error);
      toast.error(polizaErrorToastMessage(parsePolizaError(error, `${FALLBACK}.`), FALLBACK));
    },
    onSuccess: () => {
      toast.success("Póliza cancelada correctamente");
    },
    // Promesa, para que la mutación siga "pending" hasta que el refetch termine
    // y el diálogo (con `closeOnConfirm={false}`) pueda cerrarse ahí.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["polizas"] }),
  });
};
