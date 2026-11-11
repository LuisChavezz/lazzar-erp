import { parseSessionEmpresa } from "@/src/lib/sessionEmpresa";
import { useSessionCompanySyncStore } from "../stores/sessionCompanySync.store";
import { clearUserScopedClientState } from "./clientSessionState";
import { persistSessionEmpresa, readPersistedSessionEmpresa } from "./persistSessionEmpresa";

const AFTER_SWITCH_PATH = "/select-branch";

interface CompleteCompanySwitchDeps {
  /** `empresa` del 200 de `cambiar-empresa` (mismo payload que `/auth/user/`). */
  empresa: unknown;
  /** `useSession().update`. */
  update: Parameters<typeof persistSessionEmpresa>[0]["update"];
}

/**
 * Cierra un cambio de empresa ya aceptado por el backend (EC-847), en este
 * orden:
 *
 * 1. Marca la empresa nueva como la confirmada de esta pestaña y suspende el
 *    vigilante (`beginSwitch`): al escribirla en la sesión nada aquí la toma
 *    por una desviación ni intenta revertirla.
 * 2. La escribe en la sesión por el camino de EC-842 (`persistSessionEmpresa`,
 *    con confirmación contra la cookie), nunca con un `update()` suelto. Así
 *    `/select-branch` arranca ya con la empresa nueva y no pide las sucursales
 *    de la anterior (`mis-sucursales` respondería 403).
 * 3. Borra el workspace del usuario (sucursal elegida, nombre de la empresa y
 *    cookie `erp_workspace_id`): la sucursal era de la empresa anterior.
 * 4. Navega a `/select-branch` con una carga COMPLETA: descarta la caché de
 *    TanStack Query, casi ninguna de cuyas llaves incluye la empresa.
 *
 * Si escribir la sesión falla se navega igual: el backend ya cambió, y la
 * sincronización de la carga nueva (`SessionCompanySync`) relee la empresa del
 * servidor. Las demás pestañas se enteran por la difusión de next-auth y las
 * recarga `SessionCompanyWatcher`.
 */
export const completeCompanySwitch = async ({ empresa, update }: CompleteCompanySwitchDeps) => {
  const nextEmpresa = parseSessionEmpresa(empresa);
  if (nextEmpresa !== undefined) {
    useSessionCompanySyncStore.getState().beginSwitch(nextEmpresa);
    try {
      await persistSessionEmpresa({
        empresa: nextEmpresa,
        update,
        readPersisted: readPersistedSessionEmpresa,
      });
    } catch {
      // La carga nueva la sincroniza.
    }
  }
  clearUserScopedClientState();
  window.location.replace(AFTER_SWITCH_PATH);
};
