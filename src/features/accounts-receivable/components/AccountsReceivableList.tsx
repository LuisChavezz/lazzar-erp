import { DataTable } from "@/src/components/DataTable";
import { accountsReceivableColumns } from "./AccountsReceivableColumns";
import { AccountsReceivable } from "../interfaces/accounts-receivable.interface";

const accountsReceivableData: AccountsReceivable[] = [
  {
    id: "1",
    invoiceNumber: "FAC-CR-2026-001",
    customer: {
      name: "Cliente Principal SA de CV",
      initials: "CP",
      colorClass: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    },
    status: "Pendiente",
    issueDate: "05 Ene 2026",
    dueDate: "20 Ene 2026",
    amount: "$65,890.00",
    balance: "$65,890.00",
    daysPastDue: "0",
  },
  {
    id: "2",
    invoiceNumber: "FAC-CR-2026-014",
    customer: {
      name: "Corporativo Delta",
      initials: "CD",
      colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    status: "Parcial",
    issueDate: "10 Ene 2026",
    dueDate: "25 Ene 2026",
    amount: "$120,300.00",
    balance: "$40,000.00",
    daysPastDue: "0",
  },
  {
    id: "3",
    invoiceNumber: "FAC-CR-2025-220",
    customer: {
      name: "Logística Express",
      initials: "LE",
      colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    status: "Vencido",
    issueDate: "01 Dic 2025",
    dueDate: "15 Dic 2025",
    amount: "$25,750.00",
    balance: "$25,750.00",
    daysPastDue: "60",
  },
  {
    id: "4",
    invoiceNumber: "FAC-CR-2026-032",
    customer: {
      name: "Grupo Comercial Alfa",
      initials: "GA",
      colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
    status: "Cobrado",
    issueDate: "03 Ene 2026",
    dueDate: "18 Ene 2026",
    amount: "$52,450.00",
    balance: "$0.00",
    daysPastDue: "0",
  },
];

export const AccountsReceivableList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={accountsReceivableColumns}
        data={accountsReceivableData}
        title="Cuentas por Cobrar"
        searchPlaceholder="Buscar factura o cliente..."
      />
    </div>
  );
};

