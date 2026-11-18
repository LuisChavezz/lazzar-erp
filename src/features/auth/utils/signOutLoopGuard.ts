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
 * Se borra al iniciar sesión (`enterNewSession`) y con "Reintentar".
 */
export const SIGN_OUT_ATTEMPTS_KEY = "erp:signout-attempts";
export const SIGN_OUT_ATTEMPTS_WINDOW_MS = 60_000;
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
    return parsed.filter(
      (at): at is number =>
        typeof at === "number" && at <= now && now - at < SIGN_OUT_ATTEMPTS_WINDOW_MS
    );
  } catch {
    return [];
  }
};

/**
 * Anota un intento si todavía cabe. Devuelve `false` sin anotar si ya se
 * agotaron los intentos, o si `sessionStorage` no está disponible.
 */
export const registerSignOutAttempt = (now = Date.now()): boolean => {
  try {
    const attempts = recentSignOutAttempts(sessionStorage.getItem(SIGN_OUT_ATTEMPTS_KEY), now);
    if (attempts.length >= SIGN_OUT_MAX_ATTEMPTS) return false;
    sessionStorage.setItem(SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([...attempts, now]));
    return true;
  } catch {
    return false;
  }
};

/** Olvida los intentos (inicio de sesión, o "Reintentar"). Nunca lanza. */
export const clearSignOutAttempts = () => {
  try {
    sessionStorage.removeItem(SIGN_OUT_ATTEMPTS_KEY);
  } catch {
    // Sin sessionStorage no hay intentos que borrar.
  }
};
