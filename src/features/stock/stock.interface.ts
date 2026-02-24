export interface StockItem {
  id: string;
  sku: string;
  product: string;
  warehouse: string;
  available: number;
  reserved: number;
  incoming: number;
  status: "Saludable" | "Riesgo" | "Crítico" | "Sobrestock";
  lastMovement: string;
}
