export interface Invoice {
  folio: string;
  client: string;
  rfc: string;
  date: string;
  dueDate: string;
  amount: number;
  status: "Pagada" | "Pendiente" | "Vencida" | "Cancelada";
}
