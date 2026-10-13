import { useSession } from "next-auth/react";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { useUsers } from "./useUsers";

/**
 * ¿El usuario de la sesión es administrador de su empresa (o superusuario)?
 *
 * Es la MISMA condición con la que el backend decide el alcance de varios
 * listados (p. ej. oportunidades: un vendedor ve las suyas; `is_admin_empresa`
 * o `is_superuser` ven las de toda la empresa). No sirve `role === "admin"` de
 * la sesión: ese rol también se concede a `is_staff`, que el backend NO trata
 * como administrador de empresa.
 *
 * La sesión no trae esos dos campos, así que se leen del registro del propio
 * usuario en el catálogo `/usuarios/` (el id de sesión es un string; el del
 * catálogo, un número).
 *
 * FALLA CERRADO: devuelve `false` mientras el catálogo carga, si falla o si el
 * usuario no aparece en él. Quien lo use para mostrar algo solo lo muestra con
 * la respuesta confirmada.
 */
export const useIsCompanyAdmin = (): boolean => {
  const { data: session } = useSession();
  const { data: users } = useUsers();

  const sessionUserId = parsePositiveId(session?.user?.id);
  if (!users || sessionUserId === null) return false;

  const currentUser = users.find((user) => user.id === sessionUserId);
  return Boolean(currentUser && (currentUser.is_admin_empresa || currentUser.is_superuser));
};
