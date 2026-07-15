import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { hasPermission } from "@/src/utils/permissions";

/**
 * Verifica sesión activa + permiso de módulo para un Route Handler de
 * `src/app/api/**` — estas rutas no pasan por `src/proxy.ts`, así que cada una
 * necesita su propio chequeo explícito. Devuelve la `session` en éxito, o una
 * `errorResponse` (401 sin sesión, 403 sin permiso) lista para retornar tal
 * cual desde el handler.
 */
export async function requireAuthenticatedSession(
  permissionCode: string,
): Promise<{ session: Session } | { errorResponse: NextResponse }> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { errorResponse: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  }

  if (
    !hasPermission(permissionCode, {
      role: session.user.role,
      permissions: session.user.permissions,
    })
  ) {
    return {
      errorResponse: NextResponse.json(
        { error: "No tienes permiso para realizar esta acción." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

/**
 * Parsea el body JSON de un Route Handler y exige que `fieldName` esté
 * presente. Devuelve el valor de ese campo (`value`) junto con el body
 * completo (`body`, para leer campos adicionales como `correo` en factura),
 * o una `errorResponse` (400 payload inválido / campo faltante).
 */
export async function parseRequiredJsonField(
  request: Request,
  fieldName: string,
): Promise<{ value: unknown; body: Record<string, unknown> } | { errorResponse: NextResponse }> {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return { errorResponse: NextResponse.json({ error: "Payload invalido." }, { status: 400 }) };
  }

  const value = body?.[fieldName];

  if (!value) {
    return {
      errorResponse: NextResponse.json(
        { error: `El campo ${fieldName} es requerido.` },
        { status: 400 },
      ),
    };
  }

  return { value, body };
}
