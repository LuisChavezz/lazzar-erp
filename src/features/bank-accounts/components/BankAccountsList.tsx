import { DataTable } from "@/src/components/DataTable";
import { bankAccountsColumns } from "./BankAccountsColumns";
import { BankAccount } from "../interfaces/bank-account.interface";

const bankAccountsData: BankAccount[] = [
  {
    id: "1",
    accountNumber: "0123-4567-89",
    bank: "BBVA",
    owner: "Empresa Principal SA de CV",
    status: "Activa",
    openingDate: "02 Ene 2022",
    currency: "MXN",
    balance: "$425,890.00",
  },
  {
    id: "2",
    accountNumber: "9876-5432-10",
    bank: "Santander",
    owner: "Empresa Principal SA de CV",
    status: "Activa",
    openingDate: "15 Mar 2023",
    currency: "USD",
    balance: "$82,300.00",
  },
  {
    id: "3",
    accountNumber: "1111-2222-33",
    bank: "Banorte",
    owner: "Empresa Principal SA de CV",
    status: "Inactiva",
    openingDate: "10 Jul 2020",
    currency: "MXN",
    balance: "$0.00",
  },
];

export const BankAccountsList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={bankAccountsColumns}
        data={bankAccountsData}
        title="Cuentas Bancarias"
        searchPlaceholder="Buscar cuenta o banco..."
      />
    </div>
  );
};

