"use client";

import { useSession } from "next-auth/react";
import {
  sessionCompanySyncKey,
  useSessionCompanySyncStore,
} from "@/src/features/auth/stores/sessionCompanySync.store";
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

  const user = status === "authenticated" ? session?.user : undefined;
  const isCurrentSync = !!user && syncKey === sessionCompanySyncKey(user.id, attempt);

  const resolved = resolveSessionCompany({
    authenticated: !!user,
    empresa: user?.empresa,
    sync: isCurrentSync ? syncStatus : "pending",
  });

  if (resolved.status === "unknown") return { status: "unknown", companyId: null, retry };
  if (resolved.status === "ready") return resolved;
  return { status: resolved.status, companyId: null };
}

/** Id de la empresa de la sesión, o `null` mientras no haya una confirmada. */
export function useSessionCompanyId(): number | null {
  return useSessionCompany().companyId;
}
