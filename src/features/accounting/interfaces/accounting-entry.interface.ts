export interface AccountingEntry {
  id: string;
  documentNumber: string;
  type: "Póliza" | "Factura" | "Complemento";
  description: string;
  date: string;
  account: string;
  debit: string;
  credit: string;
  balance: string;
}

