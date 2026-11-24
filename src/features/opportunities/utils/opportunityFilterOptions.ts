import type { ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { withHomonymClienteIds } from "@/src/features/quotes/utils/quoteClienteLabel";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { ESTADO_OPORTUNIDAD_CFG } from "../constants/opportunityChoices";
import {
  getOpportunityClienteLabel,
  isOpportunityClienteHidden,
} from "./opportunityClienteLabel";

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
 * (`getOpportunityClienteLabel`, EC-810): la razón social tal cual; en blanco,
 * el nombre; sin ninguno, `Cliente #<id>`. Si dos clientes comparten la
 * etiqueta, solo esos llevan su id para distinguirlos (`withHomonymClienteIds`,
 * la MISMA regla que el filtro de cotizaciones).
 *
 * El catálogo solo trae clientes que el usuario ve; aun así, uno sin `nombre`
 * contaría como oculto (EC-940): no se ofrece, porque no se puede nombrar ni
 * distinguir de otro sin delatar su id.
 *
 * `Customer.id` está tipado como string pero el backend manda un número: el
 * valor es su forma en texto, que es como viaja en la URL.
 */
export const buildOpportunityClienteFilterOptions = (
  customers: readonly CustomerOptionSource[]
): ColumnFilterOption[] => {
  const visibles: OpportunityCatalogEntry[] = [];
  for (const customer of customers) {
    const id = Number(customer.id);
    const cliente = {
      cliente: id,
      cliente_razon_social: customer.razon_social ?? null,
      cliente_nombre: customer.nombre ?? null,
    };
    const label = getOpportunityClienteLabel(cliente);
    if (label === null || isOpportunityClienteHidden(cliente)) continue;
    visibles.push({ value: String(id), label, active: customer.activo });
  }
  return sortOpportunityCatalogOptions(withHomonymClienteIds(visibles));
};
