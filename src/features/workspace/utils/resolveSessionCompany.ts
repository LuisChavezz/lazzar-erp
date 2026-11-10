import type { SessionCompanySyncStatus } from "@/src/features/auth/stores/sessionCompanySync.store";

/** Estado de la empresa de la sesión (EC-842), sin la acción de reintento. */
export type ResolvedSessionCompany =
  | { status: "ready"; companyId: number }
  | { status: "none" | "loading" | "unknown"; companyId: null };

/**
 * Resuelve la empresa de la sesión a partir del valor del token y del estado de
 * la relectura de `/auth/user/` de este arranque (`SessionCompanySync`).
 *
 * - `empresa` numérica → `ready` al instante; la relectura la corrige después
 *   si cambió (el token nuevo trae la empresa nueva).
 * - `null` → `none` solo cuando la relectura terminó (o falló y el token es lo
 *   único que hay); mientras corre, `loading`. Así no se muestra "sin empresa"
 *   a quien acaban de asignársela.
 * - ausente (`undefined`, token anterior a EC-842) → `loading` hasta que la
 *   relectura escriba la clave; si falla, `unknown`. NUNCA `none`.
 *
 * `sync` es el estado de la relectura de ESTE usuario e intento: quien llama
 * pasa `"pending"` si la relectura vigente es de otro usuario o intento.
 */
export function resolveSessionCompany({
  authenticated,
  empresa,
  sync,
}: {
  authenticated: boolean;
  empresa: number | null | undefined;
  sync: SessionCompanySyncStatus;
}): ResolvedSessionCompany {
  if (!authenticated) return { status: "loading", companyId: null };
  if (typeof empresa === "number") return { status: "ready", companyId: empresa };
  if (empresa === null) {
    return { status: sync === "pending" ? "loading" : "none", companyId: null };
  }
  return { status: sync === "failed" ? "unknown" : "loading", companyId: null };
}
