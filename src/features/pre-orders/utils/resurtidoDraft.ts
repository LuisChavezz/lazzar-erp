import type { PreOrderLineTipo, ResurtidoLineaBody } from "../interfaces/pre-order.interface";

/**
 * Un renglón en captura del alta de resurtido. `ref` es lo que viaja al
 * backend: variante (o su SKU, si vino pegado y no está en el catálogo
 * cargado) o producto sin variante (siempre se compra).
 */
export interface ResurtidoDraftLine {
  key: string;
  ref: { variante: number } | { sku: string } | { producto: number };
  nombre: string;
  detalle: string;
  codigo: string;
  unidad: string;
  /** `null` = aún no se sabe (renglón pegado) o no se puede resurtir. */
  tipo: PreOrderLineTipo | null;
  cantidad: string;
}

export const draftKey = (ref: ResurtidoDraftLine["ref"]): string =>
  "variante" in ref ? `v:${ref.variante}` : "producto" in ref ? `p:${ref.producto}` : `s:${ref.sku}`;

/** Lo fabricado va en piezas enteras; lo que se compra admite hasta 4 decimales. */
export const isValidResurtidoQty = (cantidad: string, tipo: PreOrderLineTipo | null): boolean => {
  if (!/^\d+(\.\d{1,4})?$/.test(cantidad) || Number(cantidad) <= 0) return false;
  return tipo !== "fabricado" || Number.isInteger(Number(cantidad));
};

/** Deja solo dígitos y un punto con hasta 4 decimales (o solo dígitos si es fabricado). */
export const sanitizeQtyInput = (value: string, tipo: PreOrderLineTipo | null): string => {
  if (tipo === "fabricado") return value.replace(/\D/g, "");
  const clean = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [int, ...rest] = clean.split(".");
  return rest.length ? `${int}.${rest.join("").slice(0, 4)}` : int;
};

/** Suma renglones con la misma llave (el backend rechaza duplicados). */
export const mergeDraftLines = (
  current: ResurtidoDraftLine[],
  incoming: ResurtidoDraftLine[],
): { lines: ResurtidoDraftLine[]; repeated: number } => {
  const byKey = new Map(current.map((l) => [l.key, l]));
  let repeated = 0;
  for (const line of incoming) {
    const prev = byKey.get(line.key);
    if (prev) {
      repeated += 1;
      const sum = Number(prev.cantidad || 0) + Number(line.cantidad || 0);
      byKey.set(line.key, { ...prev, cantidad: String(Number(sum.toFixed(4))) });
    } else {
      byKey.set(line.key, line);
    }
  }
  return { lines: [...byKey.values()], repeated };
};

export const toLineaBody = (l: ResurtidoDraftLine): ResurtidoLineaBody => ({ ...l.ref, cantidad: l.cantidad });
