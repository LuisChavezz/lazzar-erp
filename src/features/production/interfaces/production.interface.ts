export interface ProductionOrder {
  id: string;
  product: string;
  quantity: number;
  startDate: string;
  status: "En Producción" | "Planificado" | "Control Calidad" | "Terminado";
  progress: number;
}
