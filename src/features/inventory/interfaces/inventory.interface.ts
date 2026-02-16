export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  status: "Optimal" | "Low" | "Out" | "Warning";
  minStock: number;
}
