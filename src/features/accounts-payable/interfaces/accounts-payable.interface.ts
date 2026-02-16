export interface AccountsPayable {
  id: string;
  invoiceNumber: string;
  supplier: {
    name: string;
    initials: string;
    colorClass: string;
  };
  status: "Pendiente" | "Parcial" | "Pagado" | "Vencido";
  dueDate: string;
  issueDate: string;
  amount: string;
  balance: string;
  daysPastDue: string;
}
