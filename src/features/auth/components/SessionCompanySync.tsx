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

/** Reaplicaciones máximas por sincronización si la sesión del cliente se revierte. */
const MAX_REAPPLIES = 3;
/** Reaplicaciones ya hechas por clave de sincronización (vive lo que la pestaña). */
const reapplies = new Map<string, number>();

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
 * viejo. Y si más tarde la sesión del CLIENTE vuelve a otro valor (la respuesta
 * de ese GET también actualiza el estado de `SessionProvider`), se reaplica la
 * empresa confirmada, con un tope por sincronización.
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
  const confirmed = useSessionCompanySyncStore((state) => state.confirmed);
  const syncStatus = useSessionCompanySyncStore((state) => state.status);
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

  // Terminada la sincronización, la sesión del cliente se apartó de la empresa
  // confirmada en esta carga (un GET de sesión tardío la revirtió): se reaplica,
  // con tope. Mientras la sincronización corre no se toca: ella misma escribe.
  useEffect(() => {
    if (!userId || !confirmed || syncStatus !== "done") return;
    if (confirmed.key !== sessionCompanySyncKey(userId, attempt)) return;
    if (sessionEmpresa === confirmed.empresa) return;
    const done = reapplies.get(confirmed.key) ?? 0;
    if (done >= MAX_REAPPLIES) return;
    reapplies.set(confirmed.key, done + 1);
    void persistSessionEmpresa({
      empresa: confirmed.empresa,
      update,
      readPersisted: readPersistedSessionEmpresa,
    });
  }, [userId, attempt, confirmed, syncStatus, sessionEmpresa, update]);

  return null;
}
