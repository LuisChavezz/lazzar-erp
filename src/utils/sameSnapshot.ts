/**
 * ¿Son iguales dos lecturas del mismo registro? Comparación profunda de datos
 * JSON (lo que devuelve la API), independiente del orden de las llaves.
 *
 * La usan los envíos de correo para no mandar una versión distinta de la que
 * el usuario confirmó: se compara el registro COMPLETO —un superconjunto de lo
 * que el diálogo muestra y de lo que se renderiza en el correo y el PDF—, así
 * que cualquier cambio cuenta. Dos GET seguidos sin ediciones devuelven el
 * mismo JSON (factura, orden de compra y cotización no traen campos volátiles).
 */
export function isSameSnapshot(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isSameSnapshot(item, b[i]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = Object.keys(aRecord);
  return (
    keys.length === Object.keys(bRecord).length &&
    keys.every((key) => Object.hasOwn(bRecord, key) && isSameSnapshot(aRecord[key], bRecord[key]))
  );
}
