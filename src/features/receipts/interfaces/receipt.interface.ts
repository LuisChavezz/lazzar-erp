export interface Receipt {
  id: string;
  provider: string;
  reference: string;
  date: string;
  items: number;
  status: "Recibiendo" | "Pendiente" | "Completado" | "Incidencia";
  warehouse: string;
}
