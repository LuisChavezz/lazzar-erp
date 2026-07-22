import { redirect } from "next/navigation";

const QUOTES_LIST_PATH = "/sales/quotes";

/**
 * Guard de la ruta /sales/quotes/[id]/edit — alcance DELIBERADAMENTE mínimo.
 *
 * Solo valida la forma del id (chequeo local, sin red). La verificación real
 * de acceso — existencia de la cotización, estatus editable (`canEditQuote`),
 * denegaciones 403/404 del backend y fallos técnicos con reintento — vive en
 * el cliente (`useQuoteEditForm` + `QuoteEditForm`), que es el ÚNICO lado con
 * credenciales en esta topología:
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
export function redirectIfQuoteCannotBeEdited(quoteId: number): void {
  // Id malformado o no positivo (ej. /sales/quotes/abc/edit): redirigir sin
  // montar el bundle del formulario.
  if (!Number.isFinite(quoteId) || quoteId <= 0) {
    redirect(QUOTES_LIST_PATH);
  }
}
