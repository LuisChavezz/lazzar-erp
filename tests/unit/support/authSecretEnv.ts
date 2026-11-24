/**
 * Secreto de NextAuth para los specs que importan `authOptions`: `authSecret`
 * lo exige al cargarse fuera de `development`. Importar ANTES de `@/src/lib/auth`.
 */
process.env.NEXTAUTH_SECRET ??= "secreto-de-prueba-unitaria";
