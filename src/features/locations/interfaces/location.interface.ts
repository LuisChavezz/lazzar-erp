export interface Location {
  id: string;
  name: string;
  code: string;
  warehouse: string; // ID or Name of the warehouse it belongs to
  status: "Disponible" | "Ocupado" | "Mantenimiento";
  type: string; // e.g., "Rack", "Piso", "Zona"
}
