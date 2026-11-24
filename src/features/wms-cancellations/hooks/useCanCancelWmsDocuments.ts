import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { WMS_CANCEL_PERMISSION } from "../constants/wmsCancellation";

/**
 * ¿Se ofrecen las cancelaciones de WMS y la reversa de TR? Con `WMS-CANCELAR`
 * (EC-945; `hasPermission` ya deja pasar al rol "admin") o siendo Mesa de
 * Control (`es_mesa_control === true`, EC-946): el backend (`exigir_permiso`
 * de las cuatro acciones, nucleo-erp#1352) acepta las dos reglas. Una sesión
 * anterior a EC-943 no trae la bandera y cuenta solo con el código; un `false`
 * explícito no quita un `WMS-CANCELAR` concedido. Sin sesión, `false`.
 */
export const canCancelWmsDocuments = (context: PermissionContext | null | undefined): boolean =>
  hasPermission(WMS_CANCEL_PERMISSION, context) || context?.es_mesa_control === true;

export const useCanCancelWmsDocuments = (): boolean => {
  const { data: session } = useSession();
  return canCancelWmsDocuments(session?.user);
};
