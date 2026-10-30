/** Rol de la sesión de NextAuth: lo que `hasPermission` cortocircuita. */
export type SessionRole = "admin" | "user";

/**
 * Mismo atajo que `tiene_permiso` del backend: superusuario o admin de
 * empresa, a quienes además llega `permisos` vacío. NO usa `es_admin`: el
 * backend lo calcula como `is_staff || is_superuser` y no exime a `is_staff`
 * de ningún permiso (EC-673).
 */
export const getSessionRole = (user: {
  is_admin_empresa?: boolean;
  is_superuser?: boolean;
}): SessionRole => (user.is_admin_empresa || user.is_superuser ? "admin" : "user");

/**
 * Rol que debe llevar un token YA emitido. El rol viaja dentro del JWT y
 * NextAuth lo vuelve a firmar en cada lectura de la sesión sin pasar por
 * `authorize()`, así que un token de antes de EC-673 conservaría "admin" para
 * `is_staff`. Con las dos banderas como booleanos se recalcula con la regla
 * actual; sin ellas (token anterior a que se guardaran) no hay con qué, y se
 * deja el rol que traía.
 */
export const getRefreshedTokenRole = (token: {
  role?: string;
  is_admin_empresa?: boolean;
  is_superuser?: boolean;
}): string | undefined =>
  typeof token.is_admin_empresa === "boolean" && typeof token.is_superuser === "boolean"
    ? getSessionRole(token)
    : token.role;
