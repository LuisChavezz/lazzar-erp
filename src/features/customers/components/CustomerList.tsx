"use client";

import { DataTable } from "@/src/components/DataTable";
import { customerColumns } from "./CustomerColumns";
import { useCustomerStore } from "../stores/customer.store";

export const CustomerList = () => {
  const customers = useCustomerStore((state) => state.customers);

  return (
    <div className="mt-12">
      <DataTable
        columns={customerColumns}
        data={customers}
        searchPlaceholder="Buscar por razón social, contacto o vendedor..."
      />
    </div>
  );
};
