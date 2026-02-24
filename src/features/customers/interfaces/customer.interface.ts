export interface CustomerItem {
  id: string;
  code: string;
  name: string;
  segment: string;
  city: string;
  status: "Activo" | "Inactivo" | "En riesgo" | "Prospecto";
  lastOrder: string;
  totalSales: string;
}
