/**
 * Parámetros que un envío NATIVO del login (antes de hidratar, cuando el
 * formulario aún no tenía `method="post"`) dejaba en la URL: los `name` de sus
 * inputs (EC-863).
 */
export const LOGIN_CREDENTIAL_PARAMS = ["email", "password"] as const;

/**
 * Ruta relativa (pathname + query + hash) sin los parámetros de credenciales,
 * o `null` si la URL no trae ninguno y no hay nada que limpiar. El resto de
 * parámetros (p. ej. el `callbackUrl` que añade el proxy) se conserva en su
 * orden.
 */
export const stripLoginCredentialParams = (href: string): string | null => {
  const url = new URL(href);
  const hasCredentials = LOGIN_CREDENTIAL_PARAMS.some((param) =>
    url.searchParams.has(param),
  );
  if (!hasCredentials) return null;

  for (const param of LOGIN_CREDENTIAL_PARAMS) url.searchParams.delete(param);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
};
