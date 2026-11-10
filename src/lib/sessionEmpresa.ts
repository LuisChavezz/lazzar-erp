/**
 * Empresa de la sesión de NextAuth (EC-842).
 *
 * Desde EC-798 el backend acota los datos SOLO por `user.empresa` (también al
 * superusuario), así que la empresa que el frontend muestra y manda sale de la
 * sesión, nunca de un selector del cliente. Viaja como el pk entero `empresa`
 * de `/auth/user/` (`UsuarioSerializer`); `empresa_id` trae el mismo valor pero
 * el schema lo publica como string, por eso no se usa.
 *
 * Tres estados en el token y en la sesión:
 * - `number`: la empresa del usuario.
 * - `null`: el usuario no tiene empresa asignada.
 * - ausente (`undefined`): token emitido antes de EC-842. Significa "no se
 *   sabe todavía", NUNCA "sin empresa"; la sincronización del cliente
 *   (`SessionCompanySync`) lo completa.
 */

/** Normaliza el `empresa` del backend: pk entero positivo o `null`. Cualquier otra cosa es `undefined` (dato inválido). */
export const parseSessionEmpresa = (value: unknown): number | null | undefined => {
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  return undefined;
};

/**
 * Aplica al token el `empresa` que manda el cliente con `useSession().update()`.
 *
 * Solo se acepta esa clave y solo con forma válida; todo lo demás del payload se
 * ignora (permisos y rol nunca se toman del cliente). El valor viene de releer
 * `/auth/user/` en el navegador, que es el único lado con las credenciales del
 * backend; el servidor de Next no puede verificarlo. Es aceptable porque la
 * empresa de la sesión es solo UX: el backend acota cada petición por
 * `user.empresa` e ignora o rechaza la empresa que mande el cliente.
 */
export const applyEmpresaUpdate = <T extends { empresa?: number | null }>(
  token: T,
  payload: unknown,
): T => {
  if (!payload || typeof payload !== "object" || !("empresa" in payload)) return token;
  const empresa = parseSessionEmpresa((payload as { empresa: unknown }).empresa);
  if (empresa === undefined) return token;
  return { ...token, empresa };
};
