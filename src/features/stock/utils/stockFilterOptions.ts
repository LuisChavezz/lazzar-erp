import {
  ALL_FILTER_OPTION,
  buildMonthFilterOptions,
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

/** Etiqueta de un valor activo que el resumen no trae entre sus opciones. */
const missingOptionLabel = (key: StockResumenOptionKey, value: string): string => {
  if (key === "ubicacion") return `Ubicación #${value}`;
  if (key === "mes") return buildMonthFilterOptions([`${value}-01`])[0]?.label ?? value;
  // nombre, tipo y color: el texto tal cual, que es lo que filtra el backend.
  return value;
};

/**
 * Las opciones con el valor activo SIEMPRE nombrado. Un filtro de la URL que
 * el resumen no conoce (un enlace con la ubicación de otro almacén, un
 * producto que ya no tiene existencias) se agrega justo después de "Todos",
 * para que el encabezado diga qué está filtrando la lista.
 */
export const withActiveStockFilterOption = (
  options: ColumnFilterOption[],
  key: StockResumenOptionKey,
  activeValue: string | undefined,
): ColumnFilterOption[] => {
  if (activeValue === undefined || options.some((option) => option.value === activeValue)) {
    return options;
  }
  const missing = { value: activeValue, label: missingOptionLabel(key, activeValue) };
  const allIndex = options.findIndex((option) => option.value === undefined);
  return [...options.slice(0, allIndex + 1), missing, ...options.slice(allIndex + 1)];
};
