/**
 * Saneado de un decimal CAPTURADO en un input de texto (no de un valor ya
 * validado): deja solo dígitos y UN punto, y recorta a `places` decimales.
 *
 * Devuelve `""` para todo lo que no sostenga un número —incluida la entrada
 * de solo punto (`"."`, `".."`, `"abc."`)—, en vez de un `"."` que parece
 * escritura parcial pero que `Decimal(".")` rechaza en el backend. El tope de
 * `places` decimales impone además, de facto, el piso de precisión del campo:
 * el menor positivo representable con 4 decimales ES 0.0001 (`min_value` de
 * `cantidad_empacada`/`cantidad_asignada`).
 *
 * Compartido entre `DecimalQuantityInput` (WMS: picking/packing) y los campos
 * de encabezado de packing (`peso_total`/`volumen_total`), que capturan
 * decimales con precisiones distintas contra el mismo contrato (4 en
 * cantidades por línea, 3 en peso/volumen) — de ahí el parámetro `places` en
 * vez de un valor fijo.
 */
export function sanitizeDecimalInput(raw: string, places: number): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;

  const intPart = cleaned.slice(0, firstDot);
  const fracPart = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, places);
  // Sin parte entera NI decimal no hay número que sostener: "." no es
  // escritura parcial válida (a diferencia de "0." o "1."), y dejarlo pasar
  // termina en un 400 del backend al serializarlo como `Decimal(".")`.
  if (intPart === "" && fracPart === "") return "";
  return `${intPart}.${fracPart}`;
}

/**
 * Normaliza un decimal capturado a la forma que se envía al backend, o `null`
 * si el campo quedó vacío (opcional no capturado) o no sostiene un número.
 *
 * Pasa por `Number` + `toFixed(places)` para que lo enviado sea siempre un
 * decimal canónico: sin punto colgante (`"12."` → `"12.000"`), sin ruido de
 * punto flotante y con la precisión exacta del campo. `null` distingue "no
 * capturado" (se omite del payload) de un `"0"` explícito.
 */
export function toSendableDecimal(value: string, places: number): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed.toFixed(places);
}
