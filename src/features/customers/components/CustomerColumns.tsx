"use client";

import { createContext, useContext } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import {
  DireccionesIcon,
  EditIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from "@/src/components/Icons";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { getFacturamaVerificationNotice } from "../utils/facturamaVerification";
import { formatUltimaCompra } from "../utils/ultimaCompra";
import { customerDetailHref } from "../utils/customerListQuery";

/**
 * Estado validado del listado (`serializeCustomersListState`) para el enlace
 * "Ver detalle", que lo lleva en `?lista=` para que "Volver" regrese a la misma
 * vista. Va por contexto y no por la factoría de columnas: cambia con cada
 * búsqueda, orden o página, y como argumento de `getCustomerColumns` recrearía
 * las columnas y remontaría las celdas (con su menú abierto).
 */
export const CustomerListQueryContext = createContext("");

interface CustomerRowCallbacks {
  onEdit: (customer: CustomerListItem) => void;
  onAddAddress: (customer: CustomerListItem) => void;
  onViewAddresses: (customer: CustomerListItem) => void;
}

/**
 * Primera columna: la razón social ES el menú de la fila (`FolioActionMenu`,
 * modo nombre), con "Ver detalle" como primera acción y enlace real (clic medio
 * abre otra pestaña). Sin punto de `activo`: el listado solo trae activos (la
 * baja es lógica), así que no distinguiría nada. Al lado, el aviso de Facturama
 * como ícono con el texto completo en el tooltip (igual que la cancelación
 * solicitada de `InvoiceColumns`); la cabecera del detalle lo dice entero.
 */
const RazonSocialCell = ({
  customer,
  onEdit,
  onAddAddress,
  onViewAddresses,
}: CustomerRowCallbacks & { customer: CustomerListItem }) => {
  const items: ActionMenuItem[] = [
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(customer),
      // `ActionMenu` filtra por `permission` con `hasPermission`, que ya
      // cortocircuita para el rol "admin".
      permission: "E-CRM-CLIENTES",
    },
    {
      // Sin código propio: el listado de direcciones es de solo lectura sin
      // E-CRM-CLIENTES (ver `CustomerList`).
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
  const facturamaNotice = getFacturamaVerificationNotice(customer);
  const listQuery = useContext(CustomerListQueryContext);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <FolioActionMenu
        name={customer.razon_social}
        // Sin sembrar la caché del detalle: `useCustomer` toma la fila de esta
        // página como `placeholderData` y siempre pide el detalle real.
        detail={{ href: customerDetailHref(customer.id, listQuery) }}
        items={items}
      />
      {facturamaNotice && (
        <span
          className="inline-flex shrink-0 text-amber-600 dark:text-amber-400"
          role="img"
          aria-label={facturamaNotice}
          title={facturamaNotice}
        >
          <ExclamationTriangleIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
};

const textCell = (value: string | null | undefined) => (
  <span className="text-slate-600 dark:text-slate-300">{value || "—"}</span>
);

/**
 * Tabla en MODO SERVIDOR (`useCustomersTable`): el backend busca, ordena y
 * pagina. `meta.serverSort` es el campo de `ordering` de cada columna (lista
 * blanca en `customersTable`). Sin filtros de encabezado: el endpoint no acepta
 * filtros. Los `id` de columna son los que leen las exportaciones
 * (`getCustomerColumnText`).
 */
export const getCustomerColumns = ({
  onEdit,
  onAddAddress,
  onViewAddresses,
}: CustomerRowCallbacks): ColumnDef<CustomerListItem>[] => [
  {
    id: "razon_social",
    accessorKey: "razon_social",
    header: "Razón social",
    // La tabla es `table-fixed`: el ancho se reparte en proporción a `size`.
    // La razón social es el dato que más se lee y la celda lleva además el ">"
    // del menú y el aviso de Facturama; teléfono y fecha caben en menos.
    size: 340,
    meta: { label: "Razón social", serverSort: "razon_social" },
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
    id: "nombre",
    accessorKey: "nombre",
    header: "Contacto",
    size: 220,
    meta: { label: "Contacto", serverSort: "nombre" },
    cell: ({ row }) => textCell(row.original.nombre),
  },
  {
    id: "telefono",
    accessorKey: "telefono",
    header: "Teléfono",
    size: 140,
    meta: { label: "Teléfono", serverSort: "telefono" },
    cell: ({ row }) => textCell(row.original.telefono),
  },
  {
    id: "correo",
    accessorKey: "correo",
    header: "Correo",
    size: 240,
    meta: { label: "Correo", serverSort: "correo" },
    cell: ({ row }) => textCell(row.original.correo),
  },
  {
    // Día de la última venta real (`fecha_ultima_compra`, EC-853); `null` =
    // "Sin compras", que al ordenar va al final en ambas direcciones.
    id: "ultima_compra",
    accessorKey: "fecha_ultima_compra",
    header: "Última Compra",
    size: 140,
    meta: { label: "Última Compra", serverSort: "fecha_ultima_compra" },
    cell: ({ row }) => {
      const value = row.original.fecha_ultima_compra;
      return (
        <span
          className={`whitespace-nowrap ${
            value === null ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {formatUltimaCompra(value)}
        </span>
      );
    },
  },
];
