export interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  capacity: string;
  status: "Activo" | "Inactivo" | "Mantenimiento";
  type: string;
}
