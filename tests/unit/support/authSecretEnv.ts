/**
 * Secreto de NextAuth para los specs que importan `authOptions`: `authSecret`
 * lo exige al cargarse fuera de `development`. Importar ANTES de `@/src/lib/auth`
 * y llamar a `restoreAuthSecretEnv()` en el cuerpo del spec (corre después de
 * todos los imports), para no dejar el secreto de prueba puesto en el worker.
 */
const previous = process.env.NEXTAUTH_SECRET;
process.env.NEXTAUTH_SECRET ??= "secreto-de-prueba-unitaria";

/** Devuelve `NEXTAUTH_SECRET` a su valor previo, o la quita si no había. */
export const restoreAuthSecretEnv = () => {
  if (previous === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = previous;
};
