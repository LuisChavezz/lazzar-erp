"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SESSION_RECOVERY_DELAYS_MS,
  SESSION_REFETCH_GRACE_MS,
  probeSession,
  requestSessionRefetch,
  waitFor,
  type SessionProbeResult,
} from "../utils/sessionRecovery";

/**
 * Fase de la recuperación cuando `useSession()` está en `unauthenticated`:
 *
 * - `idle`: no aplica (la sesión carga o ya está).
 * - `recovering`: se está volviendo a pedir; la UI debe tratarlo como "cargando".
 * - `exhausted`: los reintentos fallaron; se ofrece "Reintentar".
 * - `noSession`: el servidor respondió que NO hay sesión (cookie expirada,
 *   cierre de sesión en otra pestaña). No se reintenta ni se avisa: es el mismo
 *   estado de antes de EC-767, y el 401 del backend acaba en `signOut`.
 */
export type SessionRecoveryPhase = "idle" | "recovering" | "exhausted" | "noSession";

interface SessionRecoveryValue {
  phase: SessionRecoveryPhase;
  /** Nueva ronda de reintentos (botón "Reintentar"). */
  retry: () => void;
}

const SessionRecoveryContext = createContext<SessionRecoveryValue>({
  phase: "idle",
  retry: () => {},
});

type RoundOutcome = "pending" | "exhausted" | "noSession";

/**
 * Recupera la sesión de NextAuth cuando su primera lectura en el cliente falla
 * (ver `utils/sessionRecovery.ts`). Vive en el layout de (Main), debajo de
 * `SessionProvider`, y es el ÚNICO lugar que reacciona a `unauthenticated`.
 *
 * Cada reintento consulta el endpoint de sesión directamente para distinguir un
 * fallo (se reintenta con espera creciente) de una respuesta "sin sesión"
 * (definitiva, se detiene). Cuando hay sesión, pide a `SessionProvider` que la
 * relea; si esa relectura también falla, la ronda sigue con el siguiente
 * intento. En cuanto `useSession()` pasa a `authenticated` la ronda se cancela.
 *
 * No choca con el cierre de sesión: `signOut` (logout y 401 sin refresh) navega a
 * `/auth/login` sin pasar esta pestaña a `unauthenticated`, y el cierre en OTRA
 * pestaña llega como respuesta "sin sesión", que nunca se reintenta.
 */
export function SessionRecoveryProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [round, setRound] = useState<{ id: number; outcome: RoundOutcome }>({
    id: 0,
    outcome: "pending",
  });
  const [previousStatus, setPreviousStatus] = useState(status);

  // Una sesión recuperada (por cualquier vía) deja lista una ronda nueva para
  // la próxima vez que se pierda. Ajuste durante el render, no en un efecto.
  if (status !== previousStatus) {
    setPreviousStatus(status);
    if (status === "authenticated" && round.outcome !== "pending") {
      setRound({ id: round.id + 1, outcome: "pending" });
    }
  }

  useEffect(() => {
    if (status !== "unauthenticated" || round.outcome !== "pending") return;

    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      let lastResult: SessionProbeResult = "failed";
      for (const delay of SESSION_RECOVERY_DELAYS_MS) {
        await waitFor(delay, signal);
        if (signal.aborted) return;
        lastResult = await probeSession(signal);
        if (signal.aborted) return;
        if (lastResult === "none") {
          setRound((current) =>
            current.id === round.id ? { ...current, outcome: "noSession" } : current
          );
          return;
        }
        // Con sesión, `SessionProvider` la relee; si lo logra, `status` cambia y
        // esta ronda se aborta. Si no, se sigue con el siguiente intento.
        if (lastResult === "session") requestSessionRefetch();
      }
      // Si el último intento sí encontró sesión, se le da tiempo a la relectura
      // antes de mostrar "Reintentar" (evita que el aviso parpadee).
      if (lastResult === "session") await waitFor(SESSION_REFETCH_GRACE_MS, signal);
      if (signal.aborted) return;
      setRound((current) =>
        current.id === round.id ? { ...current, outcome: "exhausted" } : current
      );
    };

    void run();
    return () => controller.abort();
  }, [status, round]);

  const phase: SessionRecoveryPhase =
    status !== "unauthenticated"
      ? "idle"
      : round.outcome === "pending"
        ? "recovering"
        : round.outcome;

  const retry = () => setRound((current) => ({ id: current.id + 1, outcome: "pending" }));

  return (
    <SessionRecoveryContext.Provider value={{ phase, retry }}>
      {children}
    </SessionRecoveryContext.Provider>
  );
}

/** Fase de recuperación de la sesión y el disparador de "Reintentar". */
export const useSessionRecovery = () => useContext(SessionRecoveryContext);
