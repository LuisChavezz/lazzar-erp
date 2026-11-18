import {
  clearLoopMark,
  isRecentLoopMark,
  LOOP_GUARD_WINDOW_MS,
  readLoopMark,
  writeLoopMark,
} from "./loopGuardStorage";

/**
 * Guarda contra ciclos del cierre de sesión (EC-851).
 *
 * Todo cierre de sesión navega a `/auth/logout`, que borra la cookie de sesión
 * de NextAuth en el servidor. Si aun así la cookie sobreviviera (un nombre o
 * atributo que el servidor no alcanzó a expirar), el proxy rebotaría el login
 * y la pestaña volvería a cerrar sesión en cada carga. Cada navegación se anota
 * aquí, en `sessionStorage` (sobrevive a las recargas de ESTA pestaña); con
 * `SIGN_OUT_MAX_ATTEMPTS` anotadas dentro de la ventana, el siguiente intento
 * ya no navega y se muestra la pantalla de error. Es solo un respaldo: en el
 * camino normal se anota un intento y la pestaña llega al login.
 *
 * Se borra al empezar un inicio de sesión (`useLogin`), al terminarlo
 * (`enterNewSession`) y con "Reintentar".
 */
export const SIGN_OUT_ATTEMPTS_KEY = "erp:signout-attempts";
export const SIGN_OUT_ATTEMPTS_WINDOW_MS = LOOP_GUARD_WINDOW_MS;
export const SIGN_OUT_MAX_ATTEMPTS = 2;

/**
 * Marcas de tiempo de los intentos que siguen dentro de la ventana. Una marca
 * ilegible cuenta como ninguna: nunca bloquea un cierre de sesión por sí sola.
 */
export const recentSignOutAttempts = (raw: string | null, now: number): number[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((at): at is number => isRecentLoopMark(at, now));
  } catch {
    return [];
  }
};

/**
 * Resultado de anotar un intento:
 * - `registered`: cabía y quedó anotado; hay que navegar.
 * - `exhausted`: ya se agotaron los intentos de la ventana; no navegar.
 * - `unavailable`: sin `sessionStorage` no se puede contar. Se navega igual:
 *   `/auth/logout` borra la cookie, así que una navegación sola no arma el
 *   ciclo, y bloquear dejaría sin cierre de sesión a quien tiene los datos del
 *   sitio bloqueados. La guarda solo aplica cuando puede contar.
 */
export type SignOutAttemptResult = "registered" | "exhausted" | "unavailable";

/** Anota un intento si todavía cabe (ver `SignOutAttemptResult`). */
export const registerSignOutAttempt = (now = Date.now()): SignOutAttemptResult => {
  const raw = readLoopMark(SIGN_OUT_ATTEMPTS_KEY);
  if (raw === undefined) return "unavailable";
  const attempts = recentSignOutAttempts(raw, now);
  if (attempts.length >= SIGN_OUT_MAX_ATTEMPTS) return "exhausted";
  return writeLoopMark(SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([...attempts, now]))
    ? "registered"
    : "unavailable";
};

/**
 * ¿Esta pestaña cerró sesión hace menos de la ventana? Sin `sessionStorage`
 * no se puede saber y responde `false`.
 */
export const hasRecentSignOutAttempt = (now = Date.now()): boolean => {
  const raw = readLoopMark(SIGN_OUT_ATTEMPTS_KEY);
  return raw !== undefined && recentSignOutAttempts(raw, now).length > 0;
};

/** Olvida los intentos (inicio de sesión, o "Reintentar"). Nunca lanza. */
export const clearSignOutAttempts = () => clearLoopMark(SIGN_OUT_ATTEMPTS_KEY);
