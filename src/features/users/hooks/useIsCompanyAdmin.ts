import { useSession } from "next-auth/react";
import {
  getCompanyAdminStatus,
  type CompanyAdminStatus,
} from "@/src/features/users/utils/companyAdminStatus";

export type { CompanyAdminStatus };

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
 * (`src/lib/auth.ts`), así que no hace falta ninguna petición. La regla vive
 * en `getCompanyAdminStatus`, para quien ya tiene el usuario en mano.
 *
 * Distingue "resuelto que no" de "todavía no se sabe": quien deba ACTUAR sobre
 * un no (p. ej. quitar un filtro que el usuario no puede usar) solo lo hace
 * con `not-admin`, nunca con `unknown`. Una sesión sin los campos es `unknown`,
 * no `not-admin`: a un administrador con un token anterior no se le trata como
 * vendedor.
 */
export const useCompanyAdminStatus = (): CompanyAdminStatus => {
  const { data: session } = useSession();
  return getCompanyAdminStatus(session?.user);
};

/**
 * Versión booleana, que FALLA CERRADO: `false` mientras no se sepa. Quien la
 * use para mostrar algo solo lo muestra con la respuesta confirmada.
 */
export const useIsCompanyAdmin = (): boolean => useCompanyAdminStatus() === "admin";
