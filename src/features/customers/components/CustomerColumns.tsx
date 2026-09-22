"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Customer } from "../interfaces/customer.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ChevronRightIcon, DireccionesIcon, EditIcon, MapPinIcon, ViewIcon } from "../../../components/Icons";

/**
 * Mismo patrón que `QuoteColumns`/`SalesOrderColumns`: el filtro de estatus
 * vive en el propio encabezado de Razón Social (ícono estilo Excel), no en el
 * panel genérico de chips de `DataTable` — consistente con el resto de listas
 * de CRM y Ventas que ya llevan su estado como punto de color embebido.
 */
const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: "bg-emerald-500" },
  { value: "false", label: "Inactivo", dotClassName: "bg-slate-400" },
];

const estatusFilterFn: FilterFn<Customer> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

// Sin columnas separadas de Estatus/Acciones: el punto de color (mismo
// patrón que `QuoteColumns`) y el menú completo (Ver Detalles/Editar/
// Direcciones/Agregar Dirección) cuelgan de la propia Razón Social, que
// funciona como trigger — un cliente no necesita competir por espacio con
// una columna de "⋮" ni con el texto "Activo"/"Inactivo".
const RazonSocialCell = ({
  customer,
  onEdit,
  onAddAddress,
  onViewAddresses,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onAddAddress: (customer: Customer) => void;
  onViewAddresses: (customer: Customer) => void;
}) => {
  const router = useRouter();
  const items: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      // Sin sembrar la caché del detalle: `useCustomer` toma la fila del
      // listado como `placeholderData` y siempre pide el detalle real.
      onSelect: () => router.push(`/sales/customers/${customer.id}`),
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(customer),
      // `ActionMenu` filtra por `permission` con `hasPermission`, que ya
      // cortocircuita para el rol "admin".
      permission: "E-CRM-CLIENTES",
    },
    {
      label: "Direcciones",
      icon: DireccionesIcon,
      onSelect: () => onViewAddresses(customer),
    },
    {
      // El catálogo no tiene un código propio para direcciones: dar de alta una
      // MODIFICA el registro del cliente, así que se rige por su permiso de
      // edición.
      label: "Agregar Dirección",
      icon: MapPinIcon,
      onSelect: () => onAddAddress(customer),
      permission: "E-CRM-CLIENTES",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${customer.activo ? "bg-emerald-500" : "bg-slate-400"}`}
        role="img"
        aria-label={customer.activo ? "Activo" : "Inactivo"}
        title={customer.activo ? "Activo" : "Inactivo"}
      />
      <ActionMenu
        items={items}
        ariaLabel="Acciones de cliente"
        align="start"
        trigger={
          <button
            type="button"
            className="group inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer text-left"
            title="Ver acciones"
          >
            {customer.razon_social}
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0"
              aria-hidden="true"
            />
          </button>
        }
      />
    </div>
  );
};

export const getCustomerColumns = (
  onEdit: (customer: Customer) => void,
  onAddAddress: (customer: Customer) => void,
  onViewAddresses: (customer: Customer) => void
): ColumnDef<Customer>[] => [
  {
    accessorKey: "razon_social",
    filterFn: estatusFilterFn,
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Razón social</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    cell: ({ row }) => (
      <RazonSocialCell
        customer={row.original}
        onEdit={onEdit}
        onAddAddress={onAddAddress}
        onViewAddresses={onViewAddresses}
      />
    ),
  },
  {
    accessorKey: "nombre",
    header: "Contacto",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("nombre")}
      </span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("telefono")}
      </span>
    ),
  },
  {
    accessorKey: "correo",
    header: "Correo",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("correo")}
      </span>
    ),
  },
  {
    // PLACEHOLDER a propósito: `Customer` (listado de `GET
    // /ventas/clientes/`) todavía no expone la fecha de última compra. Fija
    // en "—" en todas las filas hasta que el backend la agregue; ese día,
    // reemplazar por un `cell` normal con `accessorKey`/`accessorFn`. Mismo
    // patrón que "Piezas"/"Vendedor" en `SalesOrderColumns.tsx`.
    id: "ultima_compra",
    header: "Última Compra",
    enableSorting: false,
    cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
  },
];
