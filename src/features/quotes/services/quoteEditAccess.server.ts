import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { hasPermission } from "@/src/utils/permissions";

const QUOTES_LIST_PATH = "/sales/quotes";

/** Código de edición de cotizaciones del catálogo de la tabla `permisos`. */
const EDIT_QUOTE_PERMISSION = "E-CRM-COTIZACIONES";

/**
 * Guard de la ruta /sales/quotes/[id]/edit — alcance DELIBERADAMENTE acotado.
 *
 * Hace DOS chequeos, ambos LOCALES (sin red):
 *
 *   1. La forma del id.
 *   2. El permiso `E-CRM-COTIZACIONES` en la sesión de NextAuth.
 *
 * El segundo es posible —y no contradice lo que se explica abajo— porque la
 * sesión de NextAuth NO es la credencial del backend: su JWT viaja en una
 * cookie del ORIGEN DE ESTA APP y lleva `role` + `permissions` (ver los
 * callbacks `jwt`/`session` de `lib/auth`). Es exactamente la misma fuente que
 * `src/proxy.ts` lee con `getToken`, así que el guard de página y el del proxy
 * no pueden discrepar. Hace falta aquí porque `routePermissions` no puede
 * expresar esta ruta: el segmento dinámico va EN MEDIO, y un prefijo
 * "/sales/quotes/" atraparía también "/new" y el listado.
 *
 * La verificación real de acceso al DATO — existencia de la cotización,
 * estatus editable (`canEditQuote`), denegaciones 403/404 del backend y fallos
 * técnicos con reintento — sigue viviendo en el cliente (`useQuoteEditForm` +
 * `QuoteEditForm`), que es el ÚNICO lado con credenciales DEL BACKEND en esta
 * topología:
 *
 *   La cookie `auth-jwt` es HttpOnly y está acotada al ORIGEN DEL BACKEND;
 *   frontend y backend viven en dominios distintos en todos los entornos
 *   configurados, así que este servidor de Next nunca la recibe y cualquier
 *   fetch de verificación al backend responde 401 de forma determinista
 *   (comprobado empíricamente: DRF autentica antes de evaluar existencia o
 *   permisos, por lo que ni siquiera un 404/403 es observable desde aquí).
 *
 * Una versión anterior de este archivo hacía esa llamada de verificación con
 * reintentos y timeout. Se eliminó porque su única rama alcanzable era
 * "401 → permitir": una ida y vuelta garantizada a fallar en cada carga de la
 * página, sin aplicar ninguna regla, y cuyo estado fail-closed quedó cubierto
 * (mejor y con credenciales reales) por la tarjeta de error con reintento del
 * cliente. Si frontend y backend llegan a compartir dominio registrable,
 * reintroducir la verificación server-side debe ser un paso consciente de esa
 * migración — no código durmiente que se "reactiva" sin haberse ejercitado.
 *
 * La frontera de seguridad real es el propio backend en cada mutación
 * (autenticación + permisos en Django); estos guards de página son UX.
 */
export async function redirectIfQuoteCannotBeEdited(
  quoteId: number,
): Promise<void> {
  // Id malformado o no positivo (ej. /sales/quotes/abc/edit): redirigir sin
  // montar el bundle del formulario.
  if (!Number.isFinite(quoteId) || quoteId <= 0) {
    redirect(QUOTES_LIST_PATH);
  }

  // Sin permiso de edición: de vuelta al listado, que solo exige el permiso de
  // lectura de la sección y por tanto sigue siendo alcanzable para este
  // usuario. `hasPermission` ya cortocircuita para el rol "admin". Sin sesión
  // no se llega hasta aquí (el proxy redirige antes al login), pero el `?.`
  // deja el guard cerrado en vez de abierto si eso cambiara.
  const session = await getServerSession(authOptions);

  if (
    !hasPermission(EDIT_QUOTE_PERMISSION, {
      role: session?.user?.role,
      permissions: session?.user?.permissions,
    })
  ) {
    redirect(QUOTES_LIST_PATH);
  }
}
