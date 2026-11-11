"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
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

/**
 * Mantiene al día la empresa de la sesión (EC-842).
 *
 * La empresa entra al JWT en el inicio de sesión y NextAuth no vuelve a pasar
 * por `authorize()` hasta el siguiente (hasta 24 h). Si el backend le cambia la
 * empresa al usuario, o el token es anterior a EC-842 y no la trae, este
 * componente relee `/auth/user/` desde el navegador —el único lado con las
 * credenciales del backend— una vez por carga de la app y por usuario, y si la
 * empresa difiere la escribe en el token con `update({ empresa })`.
 *
 * La escritura se CONFIRMA contra la sesión persistida (`persistSessionEmpresa`):
 * un `GET /api/auth/session` en vuelo puede reescribir la cookie con el token
 * viejo. Si más tarde la sesión del CLIENTE se aparta de la empresa confirmada
 * (ese GET tardío, o un cambio de empresa en otra pestaña), lo atiende
 * `SessionCompanyWatcher`: vuelve a preguntar al servidor en vez de reaplicar
 * a ciegas la empresa confirmada (EC-847).
 *
 * Si cambió, invalida toda la caché de TanStack Query: lo cargado hasta ahora
 * pertenece a la empresa anterior.
 *
 * Vive en los layouts de (Main) y de /select-branch; no pinta nada.
 */
export function SessionCompanySync() {
  const { data: session, status, update } = useSession();
  const queryClient = useQueryClient();
  const attempt = useSessionCompanySyncStore((state) => state.attempt);
  const userId = status === "authenticated" ? session?.user?.id : undefined;
  const sessionEmpresa = session?.user?.empresa;

  useEffect(() => {
    if (!userId) return;
    const store = useSessionCompanySyncStore.getState();
    const key = sessionCompanySyncKey(userId, attempt);
    // Ya corrió para este usuario e intento (remontaje, StrictMode o el nuevo
    // `session` que deja el propio `update`).
    if (store.key === key) return;
    store.begin(key);

    void (async () => {
      try {
        const user = await getCurrentUser();
        const empresa = parseSessionEmpresa(user.empresa);
        if (empresa === undefined) throw new Error("`empresa` inválida en /auth/user/");

        useSessionCompanySyncStore.getState().confirm(key, empresa);
        if (empresa !== sessionEmpresa) {
          const persisted = await persistSessionEmpresa({
            empresa,
            update,
            readPersisted: readPersistedSessionEmpresa,
          });
          if (!persisted) throw new Error("No se pudo actualizar la sesión");
          void queryClient.invalidateQueries();
        }
        useSessionCompanySyncStore.getState().finish(key, "done");
      } catch {
        useSessionCompanySyncStore.getState().finish(key, "failed");
      }
    })();
  }, [userId, attempt, sessionEmpresa, update, queryClient]);

  return null;
}
