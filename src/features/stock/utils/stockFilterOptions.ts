import {
  ALL_FILTER_OPTION,
  type ColumnFilterOption,
} from "@/src/utils/columnFilterOptions";
import type { StockPorAlmacenResumen } from "../interfaces/stock-por-almacen.interface";

export type StockResumenOptionKey = keyof StockPorAlmacenResumen["opciones"];

type StockFilterOptionsByKey = Record<StockResumenOptionKey, ColumnFilterOption[]>;

/**
 * Una respuesta del resumen → opciones de cada filtro de encabezado, con
 * "Todos" al frente y el valor en texto (como viaja en la URL; `ubicacion` es
 * un id). Se arma UNA vez por respuesta: los encabezados (siete columnas, dos
 * copias del `<thead>`) lo comparten por identidad del objeto, que TanStack
 * conserva mientras los datos no cambian.
 */
const optionsByResumen = new WeakMap<StockPorAlmacenResumen, StockFilterOptionsByKey>();

export const stockResumenFilterOptions = (
  resumen: StockPorAlmacenResumen,
): StockFilterOptionsByKey => {
  const cached = optionsByResumen.get(resumen);
  if (cached) return cached;
  const toOptions = (opciones: { value: string | number; label: string }[]) => [
    ALL_FILTER_OPTION,
    ...opciones.map((option) => ({ value: String(option.value), label: option.label })),
  ];
  const built: StockFilterOptionsByKey = {
    nombre: toOptions(resumen.opciones.nombre),
    tipo: toOptions(resumen.opciones.tipo),
    color: toOptions(resumen.opciones.color),
    ubicacion: toOptions(resumen.opciones.ubicacion),
    mes: toOptions(resumen.opciones.mes),
  };
  optionsByResumen.set(resumen, built);
  return built;
};
