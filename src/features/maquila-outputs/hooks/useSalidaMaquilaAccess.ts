import { useRouteAccess } from "@/src/hooks/useRouteAccess";
import { permissionGate, type PermissionGate } from "@/src/utils/permissionGate";
import { canSeeProductionCosts } from "@/src/utils/productionPermissions";
import { canGenerateSalidaMaquila, canWriteSalidaMaquila } from "../utils/salidaMaquilaAccess";

/**
 * Permisos de las pantallas de SM leídos de la sesión, con el estado
 * PENDIENTE de EC-895 mientras la sesión carga o se recupera (`useRouteAccess`):
 *
 * - `amounts`: ver precio, importe y total (`R-PRODUCCION-COSTOS`). Pendiente no
 *   es "denegado": quien lo consume espera en vez de pintar sin montos y
 *   agregarlos después.
 * - `canWrite` / `canGenerate`: acciones; mientras está pendiente no se ofrecen.
 */
export const useSalidaMaquilaAccess = (): {
  amounts: PermissionGate;
  canWrite: boolean;
  canGenerate: boolean;
} => {
  const { isPending, user } = useRouteAccess();
  return {
    amounts: permissionGate(isPending, canSeeProductionCosts(user)),
    canWrite: !isPending && canWriteSalidaMaquila(user),
    canGenerate: !isPending && canGenerateSalidaMaquila(user),
  };
};
