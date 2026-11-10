"use client";

import { useSession } from "next-auth/react";
import {
  sessionCompanySyncKey,
  useSessionCompanySyncStore,
} from "@/src/features/auth/stores/sessionCompanySync.store";

/**
 * Empresa del workspace (EC-842): la de la sesión, que es la única con la que
 * el backend acota los datos desde EC-798. Nunca sale del store ni de
 * `mis-empresas/`.
 *
 * - `ready`: hay empresa (`companyId`). Se usa en cuanto llega en el token; la
 *   relectura de `/auth/user/` la corrige después si cambió.
 * - `none`: el usuario no tiene empresa asignada. Solo se afirma cuando la
 *   relectura de este arranque lo confirmó (o no se pudo hacer y el token lo
 *   dice), para no mostrar "sin empresa" a quien acaban de asignársela.
 * - `loading`: aún no se sabe (sesión cargando, token anterior a EC-842 sin la
 *   clave, o `null` pendiente de confirmar).
 * - `unknown`: token sin la clave y la relectura falló; `retry` la repite.
 *   Nunca se trata como "sin empresa".
 */
export type SessionCompany =
  | { status: "ready"; companyId: number }
  | { status: "none" | "loading"; companyId: null }
  | { status: "unknown"; companyId: null; retry: () => void };

export function useSessionCompany(): SessionCompany {
  const { data: session, status } = useSession();
  const syncKey = useSessionCompanySyncStore((state) => state.key);
  const syncStatus = useSessionCompanySyncStore((state) => state.status);
  const attempt = useSessionCompanySyncStore((state) => state.attempt);
  const retry = useSessionCompanySyncStore((state) => state.retry);

  if (status !== "authenticated" || !session?.user) {
    return { status: "loading", companyId: null };
  }

  const empresa = session.user.empresa;
  if (typeof empresa === "number") return { status: "ready", companyId: empresa };

  const isCurrentSync = syncKey === sessionCompanySyncKey(session.user.id, attempt);
  const sync = isCurrentSync ? syncStatus : "pending";

  if (empresa === null) {
    return sync === "pending" ? { status: "loading", companyId: null } : { status: "none", companyId: null };
  }

  // Token anterior a EC-842: sin la clave.
  return sync === "failed"
    ? { status: "unknown", companyId: null, retry }
    : { status: "loading", companyId: null };
}

/** Id de la empresa de la sesión, o `null` mientras no haya una confirmada. */
export function useSessionCompanyId(): number | null {
  return useSessionCompany().companyId;
}
