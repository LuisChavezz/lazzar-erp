import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { WMS_CANCEL_PERMISSION } from "../constants/wmsCancellation";

/**
 * ¿Se ofrecen las cancelaciones de WMS y la reversa de TR? Solo con
 * `WMS-CANCELAR` (EC-945); `hasPermission` ya deja pasar al rol "admin". Mesa de
 * Control (`es_mesa_control`) es de EC-946. Sin sesión cargada, `false`.
 */
export const useCanCancelWmsDocuments = (): boolean => {
  const { data: session } = useSession();
  return hasPermission(WMS_CANCEL_PERMISSION, session?.user);
};
