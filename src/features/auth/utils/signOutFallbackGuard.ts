/**
 * Guarda contra ciclos del respaldo de cierre de sesión (EC-851).
 *
 * El respaldo de `signOutToLogin` navega a `/auth/logout`. Si aun así la
 * cookie de sesión sobreviviera (un nombre o atributo que el servidor no
 * alcanzó a expirar), el proxy rebotaría el login y la pestaña volvería a
 * cerrar sesión en cada carga. Cada navegación del respaldo se anota aquí, en
 * `sessionStorage` (sobrevive a las recargas de ESTA pestaña); con
 * `SIGN_OUT_FALLBACK_MAX_ATTEMPTS` anotadas dentro de la ventana, el siguiente
 * intento ya no navega y se muestra la pantalla de error.
 *
 * Se borra al iniciar sesión (`enterNewSession`) y con "Reintentar".
 */
export const SIGN_OUT_FALLBACK_KEY = "erp:signout-fallback";
export const SIGN_OUT_FALLBACK_WINDOW_MS = 60_000;
export const SIGN_OUT_FALLBACK_MAX_ATTEMPTS = 2;

/**
 * Marcas de tiempo de los intentos que siguen dentro de la ventana. Una marca
 * ilegible cuenta como ninguna: nunca bloquea un cierre de sesión por sí sola.
 */
export const recentSignOutFallbackAttempts = (raw: string | null, now: number): number[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (at): at is number =>
        typeof at === "number" && at <= now && now - at < SIGN_OUT_FALLBACK_WINDOW_MS
    );
  } catch {
    return [];
  }
};

/** ¿Todavía se puede navegar con estos intentos recientes? */
export const canAttemptSignOutFallback = (recentAttempts: readonly number[]): boolean =>
  recentAttempts.length < SIGN_OUT_FALLBACK_MAX_ATTEMPTS;

/**
 * Anota un intento si todavía cabe. Devuelve `false` sin anotar si ya se
 * agotaron los intentos, o si `sessionStorage` no está disponible: sin poder
 * contar, navegar arriesga el ciclo (la misma regla que `reloadThroughProxy`).
 */
export const registerSignOutFallbackAttempt = (now = Date.now()): boolean => {
  try {
    const attempts = recentSignOutFallbackAttempts(
      sessionStorage.getItem(SIGN_OUT_FALLBACK_KEY),
      now
    );
    if (!canAttemptSignOutFallback(attempts)) return false;
    sessionStorage.setItem(SIGN_OUT_FALLBACK_KEY, JSON.stringify([...attempts, now]));
    return true;
  } catch {
    return false;
  }
};

/** Olvida los intentos (inicio de sesión, o "Reintentar"). Nunca lanza. */
export const clearSignOutFallbackAttempts = () => {
  try {
    sessionStorage.removeItem(SIGN_OUT_FALLBACK_KEY);
  } catch {
    // Sin sessionStorage no hay intentos que borrar.
  }
};
