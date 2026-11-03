"use client";

import { useSession } from "next-auth/react";
import {
  type FinanceWriteAccess,
  getFinanceWriteAccess,
} from "@/src/utils/financeWritePermission";

/**
 * Permiso de escritura de Finanzas del usuario de la sesión
 * (`getFinanceWriteAccess`): `loading` mientras la sesión llega, para no
 * confundirlo con "sin permiso".
 */
export const useFinanceWriteAccess = (): FinanceWriteAccess => {
  const { data: session, status } = useSession();
  return getFinanceWriteAccess(status, session?.user);
};
