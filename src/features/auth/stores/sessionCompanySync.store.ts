import { create } from "zustand";

export type SessionCompanySyncStatus = "pending" | "done" | "failed";

interface SessionCompanySyncState {
  /** `${userId}:${attempt}` de la última sincronización lanzada. */
  key: string | null;
  status: SessionCompanySyncStatus;
  /** Sube con "Reintentar" para lanzar otra sincronización. */
  attempt: number;
  /**
   * Empresa que `/auth/user/` confirmó en la sincronización `key`: la empresa
   * de los datos que esta pestaña tiene cargados. Si después la sesión del
   * cliente se aparta de ella, `SessionCompanyWatcher` vuelve a preguntar al
   * servidor (EC-847).
   */
  confirmed: { key: string; empresa: number | null } | null;
  /**
   * Esta pestaña está cambiando de empresa (`cambiar-empresa`, EC-847) y va a
   * navegar con una carga completa: el vigilante no debe reaccionar a la
   * empresa nueva que ella misma escribe en la sesión.
   */
  switching: boolean;
  begin: (key: string) => void;
  finish: (key: string, status: Exclude<SessionCompanySyncStatus, "pending">) => void;
  confirm: (key: string, empresa: number | null) => void;
  /**
   * Marca `empresa` (la que devolvió `cambiar-empresa`) como la confirmada de
   * la sincronización vigente y suspende el vigilante. Va ANTES de escribirla
   * en la sesión: así nada en esta pestaña la toma por una desviación.
   */
  beginSwitch: (empresa: number | null) => void;
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
  switching: false,
  begin: (key) => set({ key, status: "pending" }),
  // Solo cierra la sincronización vigente: una respuesta tardía de un intento
  // anterior (u otro usuario) no pisa el estado.
  finish: (key, status) => {
    if (get().key === key) set({ status });
  },
  confirm: (key, empresa) => {
    if (get().key === key) set({ confirmed: { key, empresa } });
  },
  beginSwitch: (empresa) => {
    const { key } = get();
    set(key ? { confirmed: { key, empresa }, switching: true } : { switching: true });
  },
  retry: () => set((state) => ({ attempt: state.attempt + 1 })),
}));

/** Clave de sincronización para un usuario en el intento actual. */
export const sessionCompanySyncKey = (userId: string, attempt: number) => `${userId}:${attempt}`;
