/**
 * Vistas del reporte de movimientos: qué columnas se ven al entrar según quién
 * lo usa. Solo cambian la visibilidad inicial; el selector de columnas de la
 * tabla sigue ofreciendo todas.
 */
export type MovementReportVista = "general" | "wms" | "contabilidad";

export const MOVEMENT_REPORT_VISTAS: { key: MovementReportVista; label: string; hint: string }[] = [
  { key: "general", label: "General", hint: "Qué se movió, cuánto y quién" },
  { key: "wms", label: "Almacén", hint: "Ubicaciones, saldo antes y después, cliente o proveedor" },
  { key: "contabilidad", label: "Contabilidad", hint: "Categoría, costos, valor, factura y póliza" },
];

/** Ids de columna visibles en cada vista (el resto arranca oculta). */
export const MOVEMENT_REPORT_VISTA_COLUMNS: Record<MovementReportVista, readonly string[]> = {
  general: [
    "fecha_movimiento",
    "tipo_movimiento",
    "referencia",
    "producto_nombre",
    "almacen_nombre",
    "cantidad",
    "costo_total",
    "usuario_nombre",
    "notas",
  ],
  wms: [
    "fecha_movimiento",
    "tipo_movimiento",
    "referencia",
    "producto_nombre",
    "almacen_nombre",
    "ubicacion_nombre",
    "cantidad",
    "saldo",
    "tercero",
    "usuario_nombre",
    "notas",
  ],
  contabilidad: [
    "fecha_movimiento",
    "tipo_movimiento",
    "referencia",
    "producto_nombre",
    "categoria",
    "cantidad",
    "costo_unitario",
    "costo_total",
    "valor",
    "tercero",
    "factura",
    "poliza",
    "notas",
  ],
};

const CATEGORIA_LABEL: Record<string, string> = {
  MATERIA_PRIMA: "Materia prima",
  EN_PROCESO: "En proceso",
  PRODUCTO_TERMINADO: "Producto terminado",
};

/** Etiqueta de la categoría de inventario; el código si el front no la conoce. */
export const categoriaInventarioLabel = (c: string | null | undefined): string | null =>
  c ? (CATEGORIA_LABEL[c] ?? c) : null;
