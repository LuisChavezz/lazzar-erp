import { ALL_FILTER_OPTION, type ColumnFilterOption } from "./columnFilterOptions";

/**
 * Opciones de un filtro de encabezado con búsqueda EN EL SERVIDOR
 * (`ServerSearchHeaderFilter`): "Todos", la opción del valor elegido y las
 * coincidencias de la búsqueda vigente, sin repetir valores.
 *
 * `selected` es la opción del valor activo resuelta aparte (`?ids=`): la
 * búsqueda vigente casi nunca la incluye (otro texto, otra página), y sin ella
 * el menú no podría nombrar ni fijar arriba lo elegido. Solo se agrega si es
 * la del valor activo: una resolución atrasada (de un valor anterior) no se
 * cuela como opción. Si la búsqueda también la trae, cuenta una sola vez.
 */
export function buildServerSearchFilterOptions({
  results,
  selected,
  activeValue,
}: {
  results: readonly ColumnFilterOption[];
  selected?: ColumnFilterOption;
  activeValue: string | undefined;
}): ColumnFilterOption[] {
  const options: ColumnFilterOption[] = [ALL_FILTER_OPTION];
  const seen = new Set<string>();
  if (selected?.value !== undefined && selected.value === activeValue) {
    options.push(selected);
    seen.add(selected.value);
  }
  for (const option of results) {
    if (option.value === undefined || seen.has(option.value)) continue;
    seen.add(option.value);
    options.push(option);
  }
  return options;
}

/**
 * Cuántas coincidencias de una búsqueda en el servidor NO llegaron en la página
 * de resultados (aviso "Sigue escribiendo para acotar"). Se cuenta contra los
 * resultados CRUDOS del servidor (`resultsCount`), no contra las opciones del
 * menú: la opción elegida va fijada aparte y, si la búsqueda también la trajo,
 * contarla de nuevo daría "1 más" con todo a la vista.
 */
export const serverSearchHiddenCount = (
  total: number | undefined,
  resultsCount: number,
): number | undefined => (total === undefined ? undefined : Math.max(0, total - resultsCount));
