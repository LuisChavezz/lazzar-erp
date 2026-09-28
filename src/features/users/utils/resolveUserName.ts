import type { User } from "../interfaces/user.interface";

/**
 * Nombre visible de un FK a `usuarios.Usuario` resuelto contra el catálogo
 * `/usuarios/` (que el endpoint del FK no incluye). Precedencia:
 *
 * 1. FK `null` → `null`: cada llamador decide su vacío ("—" en incidencias,
 *    "Sin registro" en el detalle de vacaciones).
 * 2. Con el catálogo cargado —aunque un refetch posterior haya fallado, porque
 *    `data` se conserva— → `nombre_completo` (el `get_full_name()` del
 *    backend), luego el email, y si el id no está en el catálogo, "Usuario #N".
 * 3. Sin datos y con la consulta en error → "Usuario #N".
 * 4. Sin datos y todavía cargando → "…". `/usuarios/` es lento (calcula
 *    permisos por usuario) y mostrar "Usuario #N" mientras tanto parecería una
 *    referencia rota, no una carga en curso.
 *
 * `usersById` es `null` mientras el catálogo no tenga datos.
 */
export const resolveUserName = (
  userId: number | null,
  usersById: Map<number, User> | null,
  usersFailed: boolean
): string | null => {
  if (userId === null) {
    return null;
  }
  if (usersById) {
    const user = usersById.get(userId);
    return user?.nombre_completo?.trim() || user?.email || `Usuario #${userId}`;
  }
  return usersFailed ? `Usuario #${userId}` : "…";
};
