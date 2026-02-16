import { DataTable } from "@/src/components/DataTable";
import { accountingColumns } from "./AccountingColumns";
import { AccountingEntry } from "../interfaces/accounting-entry.interface";

const accountingData: AccountingEntry[] = [
  {
    id: "1",
    documentNumber: "POL-2026-001",
    type: "Póliza",
    description: "Póliza de ingresos enero",
    date: "05 Ene 2026",
    account: "4100-Ingresos Nacionales",
    debit: "$0.00",
    credit: "$152,300.00",
    balance: "$152,300.00",
  },
  {
    id: "2",
    documentNumber: "POL-2026-015",
    type: "Póliza",
    description: "Póliza de egresos proveedores",
    date: "08 Ene 2026",
    account: "5100-Proveedores Nacionales",
    debit: "$82,500.00",
    credit: "$0.00",
    balance: "$69,800.00",
  },
  {
    id: "3",
    documentNumber: "FAC-2026-120",
    type: "Factura",
    description: "Factura cliente principal",
    date: "10 Ene 2026",
    account: "1200-Clientes Nacionales",
    debit: "$45,890.00",
    credit: "$0.00",
    balance: "$115,690.00",
  },
  {
    id: "4",
    documentNumber: "COMP-2026-008",
    type: "Complemento",
    description: "Complemento de pago cliente principal",
    date: "15 Ene 2026",
    account: "1200-Clientes Nacionales",
    debit: "$0.00",
    credit: "$25,000.00",
    balance: "$90,690.00",
  },
];

export const AccountingList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={accountingColumns}
        data={accountingData}
        title="Movimientos Contables"
        searchPlaceholder="Buscar póliza, factura o cuenta..."
      />
    </div>
  );
};

