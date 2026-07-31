import type { EmbroideryOnboardingOperador } from "../interfaces/embroidery.interface";

/** Datos del usuario autenticado que hacen falta para resolver el operador. */
export interface AssignedOperatorSessionUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

/**
 * Nombre del operador que quedará asignado a la orden de bordado.
 *
 * SIEMPRE es el usuario autenticado: el service hace `usuario_asignado=user`
 * ignorando por completo el body (`usuario_asignado` es `read_only` en el
 * serializer). Esta función NO elige operador —no hay nada que elegir—, solo
 * resuelve cómo NOMBRARLO en la UI.
 *
 * Se busca el id de sesión DENTRO del catálogo (`find`, nunca `operadores[0]`)
 * para reutilizar el nombre que el backend ya resolvió con
 * `get_full_name() or email`. El id de sesión es el del `Usuario` de Django
 * (`session.user.id` sale de `token.sub`, que `authorize()` fija con
 * `String(user.id)` leído de `/auth/user/`), así que la comparación con
 * `operador.id` es legítima; se compara como string porque NextAuth lo
 * serializa así.
 *
 * Si el usuario no aparece en el catálogo —puede pasar: la lista se limita a
 * `is_active=True` de su empresa— se cae al nombre y luego al correo de la
 * sesión, en vez de mostrar el operador equivocado.
 */
export function resolveAssignedOperator(
  operadores: EmbroideryOnboardingOperador[],
  sessionUser: AssignedOperatorSessionUser | null | undefined,
): string {
  const sessionId = sessionUser?.id;
  const match = sessionId
    ? operadores.find((operador) => String(operador.id) === sessionId)
    : undefined;

  return match?.nombre ?? sessionUser?.name ?? sessionUser?.email ?? "Usuario actual";
}
