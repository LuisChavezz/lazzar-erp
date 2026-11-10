import { create } from "zustand";

export type SessionCompanySyncStatus = "pending" | "done" | "failed";

interface SessionCompanySyncState {
  /** `${userId}:${attempt}` de la última sincronización lanzada. */
  key: string | null;
  status: SessionCompanySyncStatus;
  /** Sube con "Reintentar" para lanzar otra sincronización. */
  attempt: number;
  /**
   * Empresa que `/auth/user/` confirmó en la sincronización `key`. Si después la
   * sesión del cliente vuelve a otro valor (un GET de sesión tardío la
   * revirtió), `SessionCompanySync` la reaplica.
   */
  confirmed: { key: string; empresa: number | null } | null;
  begin: (key: string) => void;
  finish: (key: string, status: Exclude<SessionCompanySyncStatus, "pending">) => void;
  confirm: (key: string, empresa: number | null) => void;
  retry: () => void;
}

/**
 * Estado de la relectura de `/auth/user/` que hace `SessionCompanySync` una vez
 * por carga de la app y por usuario. Sin persistencia a propósito: cada carga
 * vuelve a preguntar.
 */
export const useSessionCompanySyncStore = create<SessionCompanySyncState>()((set, get) => ({
  key: null,
  status: "pending",
  attempt: 0,
  confirmed: null,
  begin: (key) => set({ key, status: "pending" }),
  // Solo cierra la sincronización vigente: una respuesta tardía de un intento
  // anterior (u otro usuario) no pisa el estado.
  finish: (key, status) => {
    if (get().key === key) set({ status });
  },
  confirm: (key, empresa) => {
    if (get().key === key) set({ confirmed: { key, empresa } });
  },
  retry: () => set((state) => ({ attempt: state.attempt + 1 })),
}));

/** Clave de sincronización para un usuario en el intento actual. */
export const sessionCompanySyncKey = (userId: string, attempt: number) => `${userId}:${attempt}`;
