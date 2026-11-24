"use client";

import { useSession } from "next-auth/react";
import { canActAsMesaControl } from "@/src/utils/permissions";

/**
 * `canActAsMesaControl` sobre la sesión actual (EC-943). Para las celdas y
 * menús que muestran acciones de Mesa de Control: `fallbackPermission` es el
 * código que gobernaba ESE control y solo cuenta en una sesión anterior que no
 * trae `es_mesa_control` (ver `src/constants/mesaControlActionPermissions.ts`).
 * Mientras la sesión carga, sin bandera ni permisos, responde `false`.
 */
export function useCanActAsMesaControl(fallbackPermission: string): boolean {
  const { data: session } = useSession();
  return canActAsMesaControl(session?.user, fallbackPermission);
}
