import type { ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { ESTADO_OPORTUNIDAD_CFG } from "../constants/opportunityChoices";

/**
 * Opciones de los filtros de encabezado del listado de oportunidades. Puras:
 * los componentes de `OpportunityHeaderFilters` las alimentan con su catálogo y
 * las prueban las pruebas unitarias.
 */

const ALL_OPTION: ColumnFilterOption = { value: undefined, label: "Todos" };

/**
 * Filtro de ESTADO: "Todos" y luego cada estado del catálogo, en su orden, con
 * su punto de color (el menú sirve de leyenda del badge de la tabla). Los
 * valores son los crudos que acepta `?estado=`.
 */
export const OPPORTUNITY_ESTADO_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_OPTION,
  ...optionsFromConfig(ESTADO_OPORTUNIDAD_CFG),
];

export interface OpportunityCatalogEntry {
  value: string;
  label: string;
  active: boolean;
}

/** "Todos" y luego los activos primero, los inactivos marcados al final; cada grupo por nombre. */
export const sortOpportunityCatalogOptions = (
  entries: readonly OpportunityCatalogEntry[]
): ColumnFilterOption[] => [
  ALL_OPTION,
  ...entries
    .slice()
    .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label, "es"))
    .map(({ value, label, active }) => ({
      value,
      label: active ? label : `${label} (inactivo)`,
    })),
];

interface CustomerOptionSource {
  id: string | number;
  razon_social?: string | null;
  nombre?: string | null;
  activo: boolean;
}

/**
 * Filtro de CLIENTE desde el catálogo de clientes, rotulado como la celda
 * (EC-810): la razón social tal cual; en blanco, el nombre; sin ninguno,
 * `Cliente #<id>`. Si dos clientes comparten la etiqueta, solo esos llevan su
 * id para distinguirlos ("LAZZAR (cliente #21)"), como en cotizaciones.
 *
 * `Customer.id` está tipado como string pero el backend manda un número: el
 * valor es su forma en texto, que es como viaja en la URL.
 */
export const buildOpportunityClienteFilterOptions = (
  customers: readonly CustomerOptionSource[]
): ColumnFilterOption[] => {
  const entries = customers.map((customer) => {
    const id = String(Number(customer.id));
    return {
      value: id,
      label: customer.razon_social?.trim() || customer.nombre?.trim() || `Cliente #${id}`,
      active: customer.activo,
    };
  });
  const countByLabel = new Map<string, number>();
  for (const entry of entries) countByLabel.set(entry.label, (countByLabel.get(entry.label) ?? 0) + 1);
  return sortOpportunityCatalogOptions(
    entries.map((entry) =>
      (countByLabel.get(entry.label) ?? 0) > 1
        ? { ...entry, label: `${entry.label} (cliente #${entry.value})` }
        : entry
    )
  );
};
