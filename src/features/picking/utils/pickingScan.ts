import type { ScanResult } from "@/src/components/ScanCapture";
import type { PickingOnboardingTalla } from "../interfaces/picking-onboarding.interface";

/**
 * Normaliza un código para comparar: sin espacios, guiones ni "/", en
 * mayúsculas. Así "1018/800/CH", "1018-800-ch" y "1018800CH" son el mismo.
 */
export const normalizeScanCode = (code: string | null | undefined): string =>
  (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Códigos con los que una talla se puede reconocer al escanear. */
export const scanCodesOf = (row: PickingOnboardingTalla): string[] =>
  [row.codigo_barras, row.producto_variante_sku, row.sku_muestra, row.producto_codigo, row.producto_cod_proscai]
    .map(normalizeScanCode)
    .filter((c) => c.length > 0);

/**
 * Talla que corresponde a un código escaneado. Si el mismo código está en
 * varias líneas (p. ej. un Proscai sin talla), gana la primera con cupo; si
 * ninguna tiene cupo, la primera que coincida (para decir "ya completa").
 */
export function findRowByScan<T extends PickingOnboardingTalla>(
  rows: readonly T[],
  code: string,
  hasRoom: (row: T) => boolean,
): T | null {
  const target = normalizeScanCode(code);
  if (!target) return null;
  const matches = rows.filter((row) => scanCodesOf(row).includes(target));
  return matches.find(hasRoom) ?? matches[0] ?? null;
}

const fmtCantidad = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 4 });

/**
 * Lo que hace una lectura (pistola o antena) en el surtido, sin tocar estado:
 * el resultado que se muestra, la talla que se abre y resalta (`null` si no
 * coincide ninguna) y, si suma, la `cantidad` nueva. `qtyOf` es lo capturado
 * HASTA esta lectura: en una tanda de la antena incluye lo que sumaron las
 * anteriores (`PendingQuantities`), así que el techo de la línea se respeta
 * exacto y lo que no cabe sale como "Talla completa" (EC-997).
 */
export function leerEnSurtido<T extends PickingOnboardingTalla>(
  rows: readonly T[],
  leido: string,
  qtyOf: (row: T) => number,
  maxOf: (row: T) => number,
): { result: ScanResult; row: T | null; cantidad?: number } {
  const row = findRowByScan(rows, leido, (r) => qtyOf(r) < maxOf(r));
  if (!row) return { result: { tone: "error", title: "No está en este pedido", detail: `Código ${leido}` }, row: null };
  const nombre = `${row.producto_nombre ?? row.producto_variante_nombre ?? "—"} · ${row.talla_nombre ?? ""}`;
  const actual = qtyOf(row);
  const techo = maxOf(row);
  if (actual + 1 > techo) {
    return {
      result: { tone: "warn", title: "Talla completa", detail: `${nombre}: ya tienes ${fmtCantidad(actual)} de ${fmtCantidad(techo)}` },
      row,
    };
  }
  return {
    result: { tone: "ok", title: `+1 ${nombre}`, detail: `${fmtCantidad(actual + 1)} de ${fmtCantidad(techo)}` },
    row,
    cantidad: actual + 1,
  };
}

/** ¿Alguna línea trae con qué escanearse? Sin códigos, el modo scanner no sirve. */
export const anyScannable = (rows: readonly PickingOnboardingTalla[]): boolean =>
  rows.some((row) => scanCodesOf(row).length > 0);

export interface PickingProductGroup<T> {
  key: string;
  nombre: string;
  color: string | null;
  rows: T[];
}

/**
 * Agrupa las tallas por producto + color (el renglón que el usuario reconoce),
 * en el orden en que llegan.
 */
export function groupByProduct<T extends PickingOnboardingTalla>(rows: readonly T[]): PickingProductGroup<T>[] {
  const groups = new Map<string, PickingProductGroup<T>>();
  for (const row of rows) {
    const key = row.es_muestra
      ? `muestra|${row.sku_muestra ?? row.pedido_detalle}`
      : `${row.producto ?? "-"}|${row.color ?? "-"}`;
    const group = groups.get(key) ?? {
      key,
      nombre: row.producto_nombre ?? row.producto_variante_nombre ?? "—",
      color: row.color_nombre,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}
