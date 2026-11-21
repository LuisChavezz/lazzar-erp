import { ajusteImporteSchema } from "../schemas/ajusteMaquila.schema";
import type {
  AjusteMaquilaLinea,
  FacturaProveedorDetalle,
} from "../interfaces/supplier-invoice.interface";

/**
 * Ajuste de la factura de maquila a la factura real del maquilero
 * (`ajustar-maquila/`, nucleo-erp #1242; EC-919). Solo se tocan precio,
 * descuento e impuesto de cada línea; la cantidad es lo que regresó y no cambia.
 * `impuesto` es un MONTO (no una tasa): total = cantidad × precio − descuento +
 * impuesto, la misma regla que el backend (`completar_linea`).
 *
 * Se calcula en centavos enteros para que el punto flotante no deje residuos.
 */

export const AJUSTE_CAMPOS = ["precio_unitario", "descuento", "impuesto"] as const;
export type AjusteCampo = (typeof AJUSTE_CAMPOS)[number];

/** Lo capturado de una línea, como texto (lo que guarda el formulario). */
export type AjusteLineaValores = Record<AjusteCampo, string>;

/** Tasa del botón "IVA 16 %": propone el impuesto como MONTO sobre la base gravable. */
export const IVA_TASA = 0.16;

const centavos = (value: string | number | null | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

const deCentavos = (cents: number): string => (cents / 100).toFixed(2);

/** Valores iniciales de una línea: los que ya tiene, en 2 decimales. */
export const ajusteValoresIniciales = (
  linea: Pick<FacturaProveedorDetalle, AjusteCampo>,
): AjusteLineaValores => ({
  precio_unitario: deCentavos(centavos(linea.precio_unitario)),
  descuento: deCentavos(centavos(linea.descuento)),
  impuesto: deCentavos(centavos(linea.impuesto)),
});

/** Subtotal (cantidad × precio) y total de una línea con lo capturado, en centavos. */
export const ajusteLineaCentavos = (
  cantidad: string,
  valores: AjusteLineaValores,
): { subtotal: number; total: number } => {
  const subtotal = Math.round((Number(cantidad) || 0) * centavos(valores.precio_unitario));
  return { subtotal, total: subtotal - centavos(valores.descuento) + centavos(valores.impuesto) };
};

/**
 * IVA de una línea como MONTO: 16 % de su base gravable (subtotal − descuento),
 * redondeado al centavo. Una base negativa da 0.
 */
export const ivaDeLinea = (cantidad: string, valores: AjusteLineaValores): string => {
  const { subtotal } = ajusteLineaCentavos(cantidad, valores);
  const base = Math.max(0, subtotal - centavos(valores.descuento));
  return deCentavos(Math.round(base * IVA_TASA));
};

/** Primer problema de una línea capturada, o `null`. */
export const ajusteLineaError = (cantidad: string, valores: AjusteLineaValores): string | null => {
  for (const campo of AJUSTE_CAMPOS) {
    const parsed = ajusteImporteSchema.safeParse(valores[campo]);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Importe inválido";
  }
  return ajusteLineaCentavos(cantidad, valores).total < 0 ? "El total de la línea queda negativo" : null;
};

/**
 * Cuerpo del POST: SOLO las líneas y los campos que cambiaron respecto a la
 * factura, con 2 decimales. Vacío si no cambió nada.
 */
export const ajusteMaquilaCambios = (
  lineas: readonly Pick<FacturaProveedorDetalle, "id" | AjusteCampo>[],
  valores: Record<string, AjusteLineaValores | undefined>,
): AjusteMaquilaLinea[] =>
  lineas.flatMap((linea) => {
    const capturado = valores[String(linea.id)];
    if (!capturado) return [];
    const cambio: AjusteMaquilaLinea = { id: linea.id };
    for (const campo of AJUSTE_CAMPOS) {
      if (centavos(capturado[campo]) !== centavos(linea[campo])) {
        cambio[campo] = deCentavos(centavos(capturado[campo]));
      }
    }
    return Object.keys(cambio).length > 1 ? [cambio] : [];
  });
