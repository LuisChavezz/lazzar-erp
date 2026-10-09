"use client";

import SupplierList from "./SupplierList";

/**
 * Procurement-specific view for the Suppliers list.
 *
 * This view reuses the shared SupplierList component (the page heading comes
 * from the global Header via the route title, so nothing is hidden here). Sin
 * `fillHeight` ni contenedor de altura acotada: la página monta los
 * indicadores de proveedores ENCIMA de esta lista y hace scroll normal (mismo
 * cambio que las listas de OC y de recepciones al recibir sus indicadores).
 * Los indicadores van en la página y no aquí dentro de `SupplierList`, que
 * Configuración también monta.
 */
export default function SupplierView() {
  return <SupplierList />;
}
