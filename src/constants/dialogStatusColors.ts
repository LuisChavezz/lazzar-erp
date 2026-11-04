/**
 * Colores disponibles para el punto de estado (y la insignia) del encabezado de
 * diálogo (`DialogHeader`). Vive aquí, y no en el componente, para que módulos
 * de datos como las configs de estatus lo tipen sin depender de un componente.
 */
export type DialogHeaderStatusColor =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "violet"
  | "orange"
  | "slate";
