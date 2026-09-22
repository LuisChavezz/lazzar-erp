"use client";

import SupplierList from "./SupplierList";

/**
 * Procurement-specific view for the Suppliers list.
 *
 * This view reuses the shared SupplierList component (the page heading comes
 * from the global Header via the route title, so nothing is hidden here) and
 * lets the table fill the bounded-height container of its page. It also serves as an extension point for future Procurement-specific KPIs or
 * customizations without affecting the Config/global Suppliers implementation.
 */
export default function SupplierView() {
  return <SupplierList fillHeight />;
}
