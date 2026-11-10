/**
 * Cookie de selección de workspace (`erp_workspace_id`). Un único módulo la
 * escribe y la borra, con los mismos atributos, para que el endurecimiento no
 * dependa de mantener varias cadenas sincronizadas a mano.
 *
 * Solo UX (no es control de acceso: el backend acota los datos por la
 * empresa/sucursal real del usuario) — `proxy.ts` únicamente comprueba su
 * existencia. `Secure` es seguro de añadir (todos los entornos desplegados son
 * HTTPS). No se marca `HttpOnly`: se escribe vía `document.cookie`, y esa API
 * del navegador no puede fijar cookies `HttpOnly` en absoluto (requeriría
 * emitirla como Set-Cookie desde el servidor), así que el atributo no aplica.
 */
const WORKSPACE_COOKIE = "erp_workspace_id";
const WORKSPACE_COOKIE_ATTRIBUTES = "path=/; SameSite=Lax; Secure";
const WORKSPACE_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60; // 1 semana

/** Marca que el usuario ya eligió su workspace (con o sin sucursal). */
export const setWorkspaceCookie = () => {
  document.cookie = `${WORKSPACE_COOKIE}=true; max-age=${WORKSPACE_COOKIE_MAX_AGE_S}; ${WORKSPACE_COOKIE_ATTRIBUTES}`;
};

/** Borra la marca: el proxy volverá a mandar a `/select-branch`. */
export const clearWorkspaceCookie = () => {
  document.cookie = `${WORKSPACE_COOKIE}=; max-age=0; ${WORKSPACE_COOKIE_ATTRIBUTES}`;
};
