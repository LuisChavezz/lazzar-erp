"use client";

import type { Column } from "@tanstack/react-table";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { useIsCompanyAdmin } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { ESTADO_OPORTUNIDAD_CFG, ESTADO_OPORTUNIDAD_VALUES } from "../constants/opportunityChoices";
import type { Opportunity } from "../interfaces/opportunity.interface";

/**
 * Encabezados con filtro de la tabla de oportunidades. Son componentes (y no
 * parte de la factoría de columnas) porque las opciones de cliente y vendedor
 * salen de un CATÁLOGO: la tabla solo tiene una página, así que nunca se
 * derivan de las filas cargadas.
 */

type OpportunityColumn = Column<Opportunity, unknown>;

const ALL_OPTION: ColumnFilterOption = { value: undefined, label: "Todos" };

/** Activos primero y, al final, los inactivos marcados; cada grupo por nombre. */
const sortCatalogOptions = (
  entries: { value: string; label: string; active: boolean }[]
): ColumnFilterOption[] =>
  entries
    .slice()
    .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label, "es"))
    .map(({ value, label, active }) => ({
      value,
      label: active ? label : `${label} (inactivo)`,
    }));

const ESTADO_OPTIONS: ColumnFilterOption[] = [
  ALL_OPTION,
  ...ESTADO_OPORTUNIDAD_VALUES.map((estado) => ({
    value: estado,
    label: ESTADO_OPORTUNIDAD_CFG[estado].label ?? estado,
    dotClassName: ESTADO_OPORTUNIDAD_CFG[estado].dot,
  })),
];

/**
 * Encabezado de la columna "Oportunidad": su etiqueta y el filtro de ESTADO
 * (la columna pinta el estado como punto de color, sin columna propia). Cada
 * opción del filtro lleva su punto (`dotClassName`), así que el menú sirve de
 * LEYENDA de colores: es donde se lee qué estado es cada punto de la tabla.
 */
export function OpportunityTituloHeader({ column }: { column: OpportunityColumn }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>Oportunidad</span>
      <ColumnHeaderFilter column={column} options={ESTADO_OPTIONS} label="estado" />
    </div>
  );
}

export function OpportunityClienteHeader({ column }: { column: OpportunityColumn }) {
  const { customers, isLoading, isInitialError } = useCustomers();
  // `Customer.id` está tipado como string, pero el backend manda un número: el
  // valor del filtro es su forma en texto, que es como viaja en la URL.
  //
  // La etiqueta lleva la razón social Y el nombre: la columna pinta
  // `cliente_nombre` (el `nombre` del cliente), así que buscar aquí lo que se
  // ve en la tabla tiene que encontrarlo.
  const options: ColumnFilterOption[] = [
    ALL_OPTION,
    ...sortCatalogOptions(
      customers.map((customer) => {
        const razonSocial = customer.razon_social?.trim() ?? "";
        const nombre = customer.nombre?.trim() ?? "";
        return {
          value: String(Number(customer.id)),
          label:
            razonSocial && nombre && razonSocial !== nombre
              ? `${razonSocial} (${nombre})`
              : razonSocial || nombre || `Cliente #${customer.id}`,
          active: customer.activo,
        };
      })
    ),
  ];

  return (
    <div className="flex items-center gap-1.5">
      <span>Cliente / Contacto</span>
      <ColumnHeaderFilter
        column={column}
        options={options}
        label="cliente"
        searchable={{ placeholder: "Buscar cliente…" }}
        isLoading={isLoading}
        isError={isInitialError}
      />
    </div>
  );
}

/**
 * El filtro solo se pinta para quien puede ver oportunidades de otros
 * (`useIsCompanyAdmin`, que falla cerrado): a un vendedor el backend le
 * devuelve solo las suyas, así que el filtro no le serviría de nada.
 *
 * El catálogo de usuarios (`/usuarios/`, lento) lo pide el componente del
 * filtro, que solo se monta para un administrador: un vendedor nunca lo carga.
 */
export function OpportunityVendedorHeader({ column }: { column: OpportunityColumn }) {
  const canSeeOthers = useIsCompanyAdmin();
  return canSeeOthers ? <VendedorFilterHeader column={column} /> : <span>Vendedor</span>;
}

function VendedorFilterHeader({ column }: { column: OpportunityColumn }) {
  const { data: users, isLoading, isError } = useUsers();

  const options: ColumnFilterOption[] = [
    ALL_OPTION,
    ...sortCatalogOptions(
      (users ?? []).map((user) => ({
        value: String(user.id),
        label: user.nombre_completo?.trim() || user.email || user.username,
        active: user.is_active,
      }))
    ),
  ];

  return (
    <div className="flex items-center gap-1.5">
      <span>Vendedor</span>
      <ColumnHeaderFilter
        column={column}
        options={options}
        label="vendedor"
        searchable={{ placeholder: "Buscar vendedor…" }}
        isLoading={isLoading}
        // Solo si el catálogo nunca cargó: un refetch fallido conserva `data`.
        isError={isError && !users}
      />
    </div>
  );
}
