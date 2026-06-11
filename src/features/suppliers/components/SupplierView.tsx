"use client";

import SupplierList from "./SupplierList";

/**
 * Procurement-specific view for the Suppliers list.
 *
 * This view reuses the shared SupplierList component but hides the "Proveedores"
 * title to keep the Procurement module consistent. It also serves as an extension
 * point for future Procurement-specific KPIs or customizations without affecting
 * the Config/global Suppliers implementation.
 */
export default function SupplierView() {
  return <SupplierList hideTitle />;
}
