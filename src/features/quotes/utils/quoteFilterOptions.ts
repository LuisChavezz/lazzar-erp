import { buildDistinctFilterOptions, type ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import { SIN_CLIENTE, type QuoteClienteOption } from "../interfaces/quote-list.interface";
import { getQuoteClienteLabel, SIN_CLIENTE_LABEL, type QuoteClienteFields } from "./quoteClienteLabel";

/**
 * Opciones del filtro de cliente, por id:
 *
 * - El valor es el que espera `?cliente=`: el id, o `sin_cliente`.
 * - El texto llega ya resuelto (razón social o, vacía, el nombre) y se pinta
 *   TAL CUAL, como la celda (`getQuoteClienteLabel`, EC-810); una etiqueta
 *   vacía se rotula `Cliente #N`.
 * - Si dos clientes comparten el texto, SOLO esos llevan su id para
 *   distinguirlos ("LAZZAR (cliente #21)"), como en EC-752.
 * - "Sin cliente" va primero (fijo arriba, como en EC-752), aunque el backend
 *   la mande al final.
 *
 * Ventas lo alimenta con `opciones/`; Mesa de Control, con las filas que
 * cargó (`buildQuoteClienteOptionsFromRows`).
 */
export const buildQuoteClienteFilterOptions = (
  options: readonly QuoteClienteOption[],
): ColumnFilterOption[] => {
  const labelOf = (option: QuoteClienteOption) => option.label.trim() || `Cliente #${option.value}`;
  const clientes = options.filter((option) => option.value !== SIN_CLIENTE);
  const countByLabel = new Map<string, number>();
  for (const option of clientes) {
    const label = labelOf(option);
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
  }
  const sinCliente = options.find((option) => option.value === SIN_CLIENTE);
  return [
    ...(sinCliente ? [{ value: SIN_CLIENTE, label: sinCliente.label || SIN_CLIENTE_LABEL }] : []),
    ...clientes.map((option) => {
      const label = labelOf(option);
      return {
        value: String(option.value),
        label: (countByLabel.get(label) ?? 0) > 1 ? `${label} (cliente #${option.value})` : label,
      };
    }),
  ];
};

/**
 * Las opciones de cliente (una por id) de un conjunto de cotizaciones ya
 * cargado, en el mismo formato que `opciones/`: ordenadas por etiqueta (y
 * por id en homónimos) y con la marca "Sin cliente" si alguna no tiene.
 * Para un listado que filtra en memoria y no tiene `opciones/`.
 *
 * La deduplicación y el orden son los de `buildDistinctFilterOptions`, que
 * descarta las filas sin cliente (valor `null`); se entra ordenado por id
 * para que su orden estable deje a los homónimos por id.
 */
export const buildQuoteClienteOptionsFromRows = (
  rows: readonly QuoteClienteFields[],
): QuoteClienteOption[] => {
  const byId = [...rows].sort((a, b) => (a.cliente ?? 0) - (b.cliente ?? 0));
  const clientes: QuoteClienteOption[] = buildDistinctFilterOptions(
    byId,
    (row) => row.cliente,
    getQuoteClienteLabel,
  ).map(({ value, label }) => ({ value: Number(value), label }));
  return rows.some((row) => row.cliente == null)
    ? [...clientes, { value: SIN_CLIENTE, label: SIN_CLIENTE_LABEL }]
    : clientes;
};

/**
 * ¿La fila corresponde al valor del filtro de cliente (`"<id>"` o
 * `sin_cliente`)? Sin valor, todo pasa.
 */
export const matchesQuoteClienteFilter = (
  row: QuoteClienteFields,
  filterValue: unknown,
): boolean => {
  if (filterValue === undefined || filterValue === null || filterValue === "") return true;
  if (filterValue === SIN_CLIENTE) return row.cliente == null;
  return row.cliente != null && String(row.cliente) === String(filterValue);
};
