/**
 * Escribe `empresa` en la sesión de NextAuth y CONFIRMA que quedó persistida
 * (EC-842).
 *
 * NextAuth reemite la cookie de sesión en cada `GET /api/auth/session`. Un GET
 * que salió ANTES del `POST` de `update()` y responde DESPUÉS vuelve a escribir
 * la cookie con el token viejo: la empresa recién sincronizada se pierde. Ese GET
 * existe en la app real (`SessionProvider` relee la sesión al volver a la
 * pestaña, `refetchOnWindowFocus`), así que tras cada `update()` se vuelve a leer
 * la sesión persistida después de una pausa y, si no trae la empresa, se reaplica.
 * Los intentos están acotados: si no se confirma, devuelve `false`.
 */

/** Pausas (ms) antes de cada comprobación; una reaplicación por cada una que falle. */
export const PERSIST_CONFIRM_DELAYS_MS = [300, 1000] as const;

interface PersistSessionEmpresaDeps {
  empresa: number | null;
  /** `useSession().update`: devuelve la sesión resultante (o `null`/`undefined`). */
  update: (data: { empresa: number | null }) => Promise<{ user?: { empresa?: number | null } } | null | undefined>;
  /** Lee la empresa de la sesión PERSISTIDA (la cookie), no del estado del cliente. */
  readPersisted: () => Promise<number | null | undefined>;
  wait?: (ms: number) => Promise<void>;
  delays?: readonly number[];
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function persistSessionEmpresa({
  empresa,
  update,
  readPersisted,
  wait = defaultWait,
  delays = PERSIST_CONFIRM_DELAYS_MS,
}: PersistSessionEmpresaDeps): Promise<boolean> {
  const apply = async () => {
    const next = await update({ empresa });
    return !!next && next.user?.empresa === empresa;
  };

  if (!(await apply())) return false;

  for (const [index, delay] of delays.entries()) {
    await wait(delay);
    if ((await readPersisted()) === empresa) return true;
    // Un GET tardío la revirtió: se reaplica, salvo tras la última comprobación.
    if (index < delays.length - 1 && !(await apply())) return false;
  }
  return false;
}

/** Empresa de la sesión persistida, leída sin caché de `/api/auth/session`. */
export const readPersistedSessionEmpresa = async (): Promise<number | null | undefined> => {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) return undefined;
  const session = (await response.json()) as { user?: { empresa?: number | null } } | null;
  return session?.user?.empresa;
};
