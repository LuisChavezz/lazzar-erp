/**
 * Orden de tallas de menor a mayor para mostrar (no para llaves): XCH < CH <
 * M < G < XG, con los múltiplos alrededor (3XCH < 2XCH < XCH … XG < 2XG < 3XG),
 * equivalentes en inglés (XS, S, M, L, XL) y tallas numéricas por su valor.
 * Lo que no se reconoce va al final, en orden alfabético.
 */
const BASE: Record<string, number> = {
  XCH: -1, XS: -1,
  CH: 0, S: 0,
  M: 1, MD: 1,
  G: 2, L: 2,
  XG: 3, XL: 3,
};

export function sizeRank(talla: string | null | undefined): number | null {
  const t = (talla ?? "").trim().toUpperCase();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return 1000 + Number(t);
  if (t in BASE) return BASE[t] * 10;
  const m = /^(\d+)X(CH|S|G|L)$/.exec(t) ?? /^(X{2,})(CH|S|G|L)$/.exec(t);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : m[1].length;
    const small = m[2] === "CH" || m[2] === "S";
    return small ? (-1 - (n - 1)) * 10 : (3 + (n - 1)) * 10;
  }
  return null;
}

export const compareSizes = (a: string | null | undefined, b: string | null | undefined): number => {
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (ra !== null && rb !== null) return ra - rb;
  if (ra !== null) return -1;
  if (rb !== null) return 1;
  return (a ?? "").localeCompare(b ?? "", "es");
};
