import { centavosAMoneda, sumImportesEnCentavos } from "@/src/utils/sumImportesEnCentavos";
import type { Cobro } from "@/src/features/collections/interfaces/collection.interface";

/** Un cobro que aplicó a la cuenta, con lo que aplicó a ELLA (no su total). */
export interface CxcCobro {
  cobro: Cobro;
  /** Suma de las líneas del cobro que apuntan a esta cuenta, decimal de 2 posiciones. */
  importe_aplicado: string;
}

/**
 * Los cobros con al menos una línea que apunta a la cuenta `cxcId`
 * (`cobro_detalles[].cxc`). El backend no filtra cobros por CxC, pero el
 * listado de cobros trae sus líneas, así que se resuelve en el cliente.
 *
 * Si un cobro aplica a la misma cuenta en más de una línea, sus importes se
 * suman en centavos. Orden: el más reciente primero (`fecha_cobro`, luego `id`).
 */
export const getCxcCobros = (cobros: readonly Cobro[], cxcId: number): CxcCobro[] =>
  cobros
    .flatMap((cobro) => {
      const lineas = cobro.cobro_detalles.filter((linea) => linea.cxc === cxcId);
      if (lineas.length === 0) return [];
      return [{ cobro, importe_aplicado: centavosAMoneda(sumImportesEnCentavos(lineas)) }];
    })
    .sort(
      (a, b) =>
        b.cobro.fecha_cobro.localeCompare(a.cobro.fecha_cobro) || b.cobro.id - a.cobro.id,
    );
