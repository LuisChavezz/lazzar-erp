export interface AccountsReceivable {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    initials: string;
    colorClass: string;
  };
  status: "Pendiente" | "Parcial" | "Cobrado" | "Vencido";
  issueDate: string;
  dueDate: string;
  amount: string;
  balance: string;
  daysPastDue: string;
}

