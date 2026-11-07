import type { ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import { capitalize } from "@/src/utils/capitalize";
import { SIN_CLIENTE, type QuoteClienteOption } from "../interfaces/quote-list.interface";

/**
 * Opciones del filtro de cliente a partir de `opciones/`:
 *
 * - El valor es el que espera `?cliente=`: el id, o `sin_cliente`.
 * - El texto es el del backend (razón social o, vacía, el nombre) con el
 *   casing de la celda (`capitalize`, como `getQuoteClienteLabel`); una
 *   etiqueta vacía se rotula `Cliente #N`.
 * - Si dos clientes comparten el texto, SOLO esos llevan su id para
 *   distinguirlos ("Acme sa de cv (cliente #10)"), como en EC-752.
 * - "Sin cliente" va primero (fijo arriba, como en EC-752), aunque el backend
 *   la mande al final.
 */
export const buildQuoteClienteFilterOptions = (
  options: readonly QuoteClienteOption[],
): ColumnFilterOption[] => {
  const labelOf = (option: QuoteClienteOption) =>
    capitalize(option.label.trim()) || `Cliente #${option.value}`;
  const clientes = options.filter((option) => option.value !== SIN_CLIENTE);
  const countByLabel = new Map<string, number>();
  for (const option of clientes) {
    const label = labelOf(option);
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
  }
  const sinCliente = options.find((option) => option.value === SIN_CLIENTE);
  return [
    ...(sinCliente ? [{ value: SIN_CLIENTE, label: sinCliente.label || "Sin cliente" }] : []),
    ...clientes.map((option) => {
      const label = labelOf(option);
      return {
        value: String(option.value),
        label: (countByLabel.get(label) ?? 0) > 1 ? `${label} (cliente #${option.value})` : label,
      };
    }),
  ];
};
