export interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  capacity: number;
  status: "Activo" | "Inactivo" | "Mantenimiento";
  type: string;
}
