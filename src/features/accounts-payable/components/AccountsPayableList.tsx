"use client";

import { DataTable } from "@/src/components/DataTable";
import { accountsPayableColumns } from "./AccountsPayableColumns";
import { AccountsPayable } from "../interfaces/accounts-payable.interface";

const accountsPayableData: AccountsPayable[] = [
  {
    id: "1",
    invoiceNumber: "FAC-2026-001",
    supplier: {
      name: "Proveedor Uno SA de CV",
      initials: "P1",
      colorClass: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    },
    status: "Pendiente",
    issueDate: "05 Ene 2026",
    dueDate: "20 Ene 2026",
    amount: "$45,890.00",
    balance: "$45,890.00",
    daysPastDue: "0",
  },
  {
    id: "2",
    invoiceNumber: "FAC-2026-014",
    supplier: {
      name: "Servicios Globales SA",
      initials: "SG",
      colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    status: "Parcial",
    issueDate: "10 Ene 2026",
    dueDate: "25 Ene 2026",
    amount: "$82,300.00",
    balance: "$25,000.00",
    daysPastDue: "0",
  },
  {
    id: "3",
    invoiceNumber: "FAC-2026-020",
    supplier: {
      name: "Distribuidora Central",
      initials: "DC",
      colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    status: "Vencido",
    issueDate: "01 Dic 2025",
    dueDate: "15 Dic 2025",
    amount: "$15,750.00",
    balance: "$15,750.00",
    daysPastDue: "60",
  },
  {
    id: "4",
    invoiceNumber: "FAC-2026-032",
    supplier: {
      name: "Logística del Norte",
      initials: "LN",
      colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
    status: "Pagado",
    issueDate: "03 Ene 2026",
    dueDate: "18 Ene 2026",
    amount: "$32,450.00",
    balance: "$0.00",
    daysPastDue: "0",
  },
];

export const AccountsPayableList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={accountsPayableColumns}
        data={accountsPayableData}
        title="Cuentas por Pagar"
        searchPlaceholder="Buscar factura o proveedor..."
      />
    </div>
  );
};

