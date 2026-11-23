/**
 * URL relativa (`pathname` + query) sin `param`, conservando el resto de la
 * query en su orden. `null` si `search` no trae `param`: no hay nada que
 * reescribir, y quien llama no toca el historial.
 */
export const urlWithoutSearchParam = (
  pathname: string,
  search: string,
  param: string,
): string | null => {
  const params = new URLSearchParams(search);
  if (!params.has(param)) return null;
  params.delete(param);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
};
