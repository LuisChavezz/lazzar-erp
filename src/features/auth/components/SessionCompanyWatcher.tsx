"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { parseSessionEmpresa } from "@/src/lib/sessionEmpresa";
import { getCurrentUser } from "../services/currentUser";
import {
  sessionCompanySyncKey,
  useSessionCompanySyncStore,
} from "../stores/sessionCompanySync.store";
import {
  persistSessionEmpresa,
  readPersistedSessionEmpresa,
} from "../utils/persistSessionEmpresa";
import {
  resolveDivergence,
  resolveRereadFailure,
  shouldRereadOnDivergence,
} from "../utils/sessionCompanyDivergence";

/** Relecturas hechas por clave de sincronización (vive lo que la pestaña). */
const rereads = new Map<string, number>();
/** Claves con una relectura en vuelo: un render nuevo no lanza otra. */
const inFlight = new Set<string>();

/**
 * Vigilante de la empresa de la sesión (EC-847), junto a `SessionUserWatcher`.
 *
 * Cuando la sesión del cliente se aparta de la empresa que esta pestaña
 * confirmó al cargar, vuelve a leer `/auth/user/` y adopta lo que diga el
 * servidor (reglas en `sessionCompanyDivergence`):
 *
 * - El servidor sigue en la empresa de la pestaña: un GET de sesión tardío la
 *   había revertido; se vuelve a escribir en la sesión. Es el caso que antes
 *   cubría la reaplicación de `SessionCompanySync`, ahora confirmado contra el
 *   servidor en vez de reescribir a ciegas.
 * - El servidor está en otra empresa (otra pestaña llamó a `cambiar-empresa`
 *   y next-auth difundió su `update()` aquí): se recarga la pestaña, que
 *   tiene en caché datos de la empresa anterior. NO reescribe la empresa
 *   vieja en la cookie compartida, que es lo que antes revertía el cambio en
 *   la pestaña que lo hizo.
 *
 * No recarga dos veces la pestaña que cambia de empresa: esa marca la empresa
 * nueva como confirmada y suspende el vigilante (`beginSwitch`) antes de
 * escribirla en la sesión, y navega ella misma. Tampoco cicla: tras recargar,
 * la sincronización de la carga nueva confirma la empresa del servidor y la
 * sesión ya coincide; y las relecturas están acotadas por sincronización.
 *
 * Si la relectura falla, solo repara una sesión que perdió la clave `empresa`
 * (vuelve a escribir la confirmada, como antes, para que la puerta de empresa
 * no se quede en "cargando"); una sesión con otra empresa definida se deja,
 * porque casi seguro es un cambio legítimo en otra pestaña.
 *
 * Vive en los layouts de (Main) y de /select-branch; no pinta nada.
 */
export function SessionCompanyWatcher() {
  const { data: session, status, update } = useSession();
  const attempt = useSessionCompanySyncStore((state) => state.attempt);
  const confirmed = useSessionCompanySyncStore((state) => state.confirmed);
  const syncStatus = useSessionCompanySyncStore((state) => state.status);
  const switching = useSessionCompanySyncStore((state) => state.switching);
  const userId = status === "authenticated" ? session?.user?.id : undefined;
  const sessionEmpresa = session?.user?.empresa;

  useEffect(() => {
    if (!userId || !confirmed) return;
    const key = sessionCompanySyncKey(userId, attempt);
    if (inFlight.has(key)) return;
    const rereadsDone = rereads.get(key) ?? 0;
    if (
      !shouldRereadOnDivergence({
        currentKey: key,
        syncStatus,
        confirmed,
        sessionEmpresa,
        switching,
        rereadsDone,
      })
    ) {
      return;
    }
    rereads.set(key, rereadsDone + 1);
    inFlight.add(key);

    const persist = (empresa: number | null) =>
      persistSessionEmpresa({ empresa, update, readPersisted: readPersistedSessionEmpresa });

    void (async () => {
      let server: number | null | undefined;
      try {
        server = parseSessionEmpresa((await getCurrentUser()).empresa);
      } catch {
        // Sin respuesta del servidor: solo se repara una sesión que perdió la
        // clave; otra empresa definida se deja (resolveRereadFailure).
        server = undefined;
      }
      try {
        if (server === undefined) {
          const store = useSessionCompanySyncStore.getState();
          if (store.switching || store.confirmed?.key !== key) return;
          if (resolveRereadFailure(sessionEmpresa) === "restore") await persist(store.confirmed.empresa);
          return;
        }
        // Mientras se preguntaba, la pestaña empezó su propio cambio de
        // empresa o lanzó otra sincronización: esta respuesta ya no aplica.
        const store = useSessionCompanySyncStore.getState();
        if (store.switching || store.confirmed?.key !== key) return;

        if (resolveDivergence(store.confirmed.empresa, server) === "reload") {
          window.location.reload();
          return;
        }
        await persist(server);
      } catch {
        // No se pudo escribir la sesión: la siguiente desviación lo reintenta.
      } finally {
        inFlight.delete(key);
      }
    })();
  }, [userId, attempt, confirmed, syncStatus, switching, sessionEmpresa, update]);

  return null;
}
