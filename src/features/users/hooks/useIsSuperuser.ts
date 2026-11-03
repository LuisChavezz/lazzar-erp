import { useSession } from "next-auth/react";
import { isSuperuser } from "@/src/features/users/utils/superuser";

/**
 * ¿El usuario de la sesión es superusuario? Falla cerrado (`false` mientras no
 * se sepa); la regla vive en `isSuperuser`. La bandera viaja en la sesión desde
 * el inicio de sesión (`src/lib/auth.ts`), sin petición extra.
 */
export const useIsSuperuser = (): boolean => {
  const { data: session } = useSession();
  return isSuperuser(session?.user);
};
