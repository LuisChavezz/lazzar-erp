"use client";

import { useSession } from "next-auth/react";
import {
  sessionCompanySyncKey,
  useSessionCompanySyncStore,
  type SessionCompanySyncStatus,
} from "@/src/features/auth/stores/sessionCompanySync.store";
import { useSessionRecovery } from "@/src/features/auth/components/SessionRecoveryProvider";
import { resolveSessionCompany } from "../utils/resolveSessionCompany";

/**
 * Empresa del workspace (EC-842): la de la sesión, que es la única con la que
 * el backend acota los datos desde EC-798. Nunca sale del store ni de
 * `mis-empresas/`. Las reglas de cada estado viven en `resolveSessionCompany`.
 *
 * - `ready`: hay empresa (`companyId`).
 * - `none`: el usuario no tiene empresa asignada (confirmado).
 * - `loading`: aún no se sabe.
 * - `unknown`: token sin la clave y la relectura falló; `retry` la repite.
 *   Nunca se trata como "sin empresa".
 * - `session-error`: la sesión no se pudo cargar y la recuperación se agotó;
 *   `retry` lanza otra ronda (el mismo "Reintentar" del sidebar).
 */
export type SessionCompany = (
  | { status: "ready"; companyId: number }
  | { status: "none" | "loading"; companyId: null }
  | { status: "unknown" | "session-error"; companyId: null; retry: () => void }
) & {
  /**
   * Estado de la relectura de `/auth/user/` de ESTA carga para este usuario
   * (`SessionCompanySync`); `pending` mientras corre o si la vigente es de
   * otro usuario o intento. Una empresa numérica ya es `ready` aunque la
   * relectura no haya terminado: quien necesite la empresa confirmada por el
   * servidor (el cambio de empresa, EC-847) mira esto.
   */
  sync: SessionCompanySyncStatus;
  /** Lanza otra relectura (sube `attempt`). */
  retrySync: () => void;
};

export function useSessionCompany(): SessionCompany {
  const { data: session, status } = useSession();
  const syncKey = useSessionCompanySyncStore((state) => state.key);
  const syncStatus = useSessionCompanySyncStore((state) => state.status);
  const attempt = useSessionCompanySyncStore((state) => state.attempt);
  const retry = useSessionCompanySyncStore((state) => state.retry);
  const { phase: recoveryPhase, retry: retrySession } = useSessionRecovery();

  const user = status === "authenticated" ? session?.user : undefined;
  const isCurrentSync = !!user && syncKey === sessionCompanySyncKey(user.id, attempt);
  const sync: SessionCompanySyncStatus = isCurrentSync ? syncStatus : "pending";

  const resolved = resolveSessionCompany({
    authenticated: !!user,
    empresa: user?.empresa,
    sync,
    recoveryPhase,
  });

  const syncInfo = { sync, retrySync: retry };
  if (resolved.status === "unknown") return { status: "unknown", companyId: null, retry, ...syncInfo };
  if (resolved.status === "session-error") {
    return { status: "session-error", companyId: null, retry: retrySession, ...syncInfo };
  }
  if (resolved.status === "ready") return { ...resolved, ...syncInfo };
  return { status: resolved.status, companyId: null, ...syncInfo };
}

/** Id de la empresa de la sesión, o `null` mientras no haya una confirmada. */
export function useSessionCompanyId(): number | null {
  return useSessionCompany().companyId;
}
