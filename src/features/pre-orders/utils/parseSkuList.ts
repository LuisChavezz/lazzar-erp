export interface SkuListLine {
  sku: string;
  cantidad: number;
}

export interface ParsedSkuList {
  lines: SkuListLine[];
  /** Renglones que no se entendieron (sin cantidad positiva, hasta 4 decimales). */
  invalid: string[];
  /** SKUs que venían más de una vez: se sumaron. */
  merged: string[];
}

/**
 * Lee una lista pegada (de Excel, CSV o a mano): un renglón por SKU, con el
 * SKU primero y la cantidad al final, separados por tabulador, coma, punto y
 * coma o espacios. Ignora renglones vacíos y un encabezado sin número. SKUs
 * repetidos se suman: el backend rechaza duplicados.
 */
export function parseSkuList(text: string): ParsedSkuList {
  const totals = new Map<string, number>();
  const seen = new Set<string>();
  const merged = new Set<string>();
  const invalid: string[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const bySeparator = line.split(/[\t;]+/).map((p) => p.trim()).filter(Boolean);
    const parts =
      bySeparator.length > 1
        ? bySeparator
        : line.includes(",") && !/\d,\d{3}\b/.test(line)
          ? line.split(",").map((p) => p.trim()).filter(Boolean)
          : line.split(/\s+/);
    const sku = parts[0]?.toUpperCase();
    const qtyText = (parts.length > 1 ? parts[parts.length - 1] : "").replace(/[,\s]/g, "");
    const cantidad = Number(qtyText);
    if (!sku || !/^\d+(\.\d{1,4})?$/.test(qtyText) || cantidad <= 0) {
      if (index > 0 || /\d/.test(line)) invalid.push(line);
      return;
    }
    if (seen.has(sku)) merged.add(sku);
    seen.add(sku);
    totals.set(sku, Number(((totals.get(sku) ?? 0) + cantidad).toFixed(4)));
  });

  return {
    lines: [...totals].map(([sku, cantidad]) => ({ sku, cantidad })),
    invalid,
    merged: [...merged],
  };
}
