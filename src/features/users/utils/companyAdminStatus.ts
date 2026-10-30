/**
 * - `admin` / `not-admin`: RESUELTO con los datos de la sesión.
 * - `unknown`: aún no se sabe — la sesión está cargando, o se creó antes de
 *   que guardara estos campos (hasta que el usuario vuelva a iniciar sesión).
 */
export type CompanyAdminStatus = "admin" | "not-admin" | "unknown";

/** Las dos banderas de la sesión con las que el backend reconoce a un admin. */
export interface CompanyAdminFlags {
  is_admin_empresa?: boolean;
  is_superuser?: boolean;
}

/**
 * ¿El usuario es administrador de su empresa (o superusuario)? Es la MISMA
 * condición con la que el backend decide el alcance de varios listados y
 * acciones. `role === "admin"` aplica hoy la misma regla, pero no distingue
 * "no se sabe" de "no", y una sesión iniciada antes de EC-673 lo tiene
 * también para `is_staff`.
 *
 * Función PURA detrás de `useCompanyAdminStatus`, para quien ya tiene el
 * usuario de la sesión en mano (y para probarla sin React). Sin las dos
 * banderas como booleanos es `unknown`, nunca `not-admin`.
 */
export const getCompanyAdminStatus = (
  user: CompanyAdminFlags | null | undefined,
): CompanyAdminStatus => {
  if (typeof user?.is_admin_empresa !== "boolean" || typeof user.is_superuser !== "boolean") {
    return "unknown";
  }
  return user.is_admin_empresa || user.is_superuser ? "admin" : "not-admin";
};
