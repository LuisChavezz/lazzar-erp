import { useSession } from "next-auth/react";

/**
 * - `admin` / `not-admin`: RESUELTO con los datos de la sesión.
 * - `unknown`: aún no se sabe — la sesión está cargando, o se creó antes de
 *   que guardara estos campos (hasta que el usuario vuelva a iniciar sesión).
 */
export type CompanyAdminStatus = "admin" | "not-admin" | "unknown";

/**
 * ¿El usuario de la sesión es administrador de su empresa (o superusuario)?
 *
 * Es la MISMA condición con la que el backend decide el alcance de varios
 * listados (p. ej. oportunidades: un vendedor ve las suyas; `is_admin_empresa`
 * o `is_superuser` ven las de toda la empresa). No sirve `role === "admin"` de
 * la sesión: ese rol también se concede a `is_staff`, que el backend NO trata
 * como administrador de empresa.
 *
 * Los dos campos viajan en la sesión desde el inicio de sesión
 * (`src/lib/auth.ts`), así que no hace falta ninguna petición.
 *
 * Distingue "resuelto que no" de "todavía no se sabe": quien deba ACTUAR sobre
 * un no (p. ej. quitar un filtro que el usuario no puede usar) solo lo hace
 * con `not-admin`, nunca con `unknown`. Una sesión sin los campos es `unknown`,
 * no `not-admin`: a un administrador con un token anterior no se le trata como
 * vendedor.
 */
export const useCompanyAdminStatus = (): CompanyAdminStatus => {
  const { data: session } = useSession();
  const user = session?.user;

  if (typeof user?.is_admin_empresa !== "boolean" || typeof user.is_superuser !== "boolean") {
    return "unknown";
  }
  return user.is_admin_empresa || user.is_superuser ? "admin" : "not-admin";
};

/**
 * Versión booleana, que FALLA CERRADO: `false` mientras no se sepa. Quien la
 * use para mostrar algo solo lo muestra con la respuesta confirmada.
 */
export const useIsCompanyAdmin = (): boolean => useCompanyAdminStatus() === "admin";
