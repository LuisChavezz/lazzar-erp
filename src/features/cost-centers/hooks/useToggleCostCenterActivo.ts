import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { setCostCenterActivo } from "../services/actions";
import type { CostCenter } from "../interfaces/cost-center.interface";
import { COST_CENTERS_KEY_ROOT, COST_CENTERS_LIST_KEY } from "./useCostCenters";

interface ToggleCostCenterActivoPayload {
  id: number;
  activo: boolean;
}

/**
 * Da de baja o reactiva un centro de costo (PATCH de `activo`).
 *
 * Ocupa el lugar que en otros catálogos tendría el hook de borrado: aquí el
 * `DELETE` del backend ES esta misma baja lógica, así que la pantalla no lo
 * expone y este PATCH cubre las dos direcciones (ver `setCostCenterActivo`).
 *
 * Actualización optimista igual que en el plan de cuentas: se cancela lo que
 * esté en vuelo, se guarda una instantánea, se escribe el valor nuevo, se
 * revierte en `onError` y se invalida en `onSettled`. El centro NO sale del
 * listado al darse de baja: sigue visible con estatus Inactivo, por eso el
 * optimista MARCA la fila en vez de filtrarla.
 *
 * El optimista escribe sobre la llave EXACTA del catálogo; la invalidación va
 * por la RAÍZ, que además refresca los selectores de la póliza —un centro recién
 * dado de baja deja de ofrecerse ahí—.
 *
 * ─── POR QUÉ EL TOAST LEE EL CUERPO ──────────────────────────────────────────
 *
 * REACTIVAR puede fallar con un 400 legítimo y explicable: el código solo es
 * único entre los ACTIVOS, así que mientras este centro estuvo de baja otro pudo
 * tomar el suyo, y el backend responde `{"codigo": ["Ya existe un centro de
 * costo con este código en la empresa."]}`. Ese mensaje es la única pista de qué
 * hacer —editar el código antes de reactivar—, y aquí no hay formulario abierto
 * donde pintarlo bajo el campo, así que se muestra VERBATIM en el toast. Un
 * texto fijo ("Error al reactivar…") dejaría al usuario sin saber por qué.
 *
 * El mensaje del backend se muestra SOLO cuando hay uno de verdad: un 400 con
 * cuerpo de errores por campo. Cualquier otro fallo —un 500, un 502 de un proxy,
 * un timeout de red— cae al texto en español de abajo. NO se encadena a
 * `extractErrorMessage`: ese helper evalúa `error instanceof Error` antes de su
 * fallback y un `AxiosError` lo satisface, así que su respaldo nunca se alcanza
 * y el usuario acabaría leyendo "Request failed with status code 502".
 *
 * El guardia de status es el mismo que usa `setCostCenterFieldErrors`: sin él,
 * un 500 que respondiera `{"detail": "Server Error"}` colaría ese texto —en
 * inglés y sin nada que el usuario pueda hacer— como si fuera el aviso del
 * conflicto de código.
 */
export const useToggleCostCenterActivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: ToggleCostCenterActivoPayload) =>
      setCostCenterActivo(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: COST_CENTERS_LIST_KEY });
      const previousCentros = queryClient.getQueryData<CostCenter[]>(
        COST_CENTERS_LIST_KEY,
      );

      if (previousCentros) {
        queryClient.setQueryData<CostCenter[]>(COST_CENTERS_LIST_KEY, (old) =>
          old
            ? old.map((centro) =>
                centro.id === id ? { ...centro, activo } : centro,
              )
            : [],
        );
      }

      return { previousCentros };
    },
    onError: (error, variables, context) => {
      if (context?.previousCentros) {
        queryClient.setQueryData(
          COST_CENTERS_LIST_KEY,
          context.previousCentros,
        );
      }
      console.error(error);
      const fallback = variables.activo
        ? "Error al reactivar el centro de costo"
        : "Error al dar de baja el centro de costo";
      const drfMessage =
        error instanceof AxiosError && error.response?.status === 400
          ? firstDrfFieldMessage(error)
          : undefined;
      toast.error(drfMessage ?? fallback);
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: COST_CENTERS_KEY_ROOT }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.activo
          ? "Centro de costo reactivado correctamente"
          : "Centro de costo dado de baja correctamente",
      );
    },
  });
};
