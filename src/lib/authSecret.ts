/**
 * Resolución del secreto de NextAuth, compartida por `authOptions`
 * (`src/lib/auth.ts`) y el proxy (`src/proxy.ts`).
 *
 * Ambos deben firmar y verificar el JWT con la MISMA clave. Si divergen, el
 * proxy no puede validar la sesión emitida por NextAuth y se produce un ciclo
 * infinito de redirecciones: proxy → /auth/login → layout → / → proxy. Por eso
 * la lógica vive aquí y no duplicada en cada archivo.
 *
 * En desarrollo se mantiene un valor de conveniencia para no obligar a cada
 * desarrollador a definir la variable. En cualquier entorno desplegado la
 * ausencia de `NEXTAUTH_SECRET` es un error fatal e inmediato: firmar los JWT
 * de sesión con una cadena versionada en el repositorio permitiría falsificar
 * sesiones de administrador, y hacerlo en silencio —la app seguiría
 * funcionando con normalidad— es peor que fallar de forma visible.
 */
const DEV_FALLBACK_SECRET = "secreto-super-seguro-para-desarrollo";

function resolveAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_FALLBACK_SECRET;
  }

  throw new Error(
    "NEXTAUTH_SECRET no está definido. Es obligatorio fuera de desarrollo: sin él " +
      "los JWT de sesión se firmarían con una clave pública del repositorio, lo que " +
      "permitiría falsificar sesiones de administrador.",
  );
}

export const authSecret = resolveAuthSecret();
