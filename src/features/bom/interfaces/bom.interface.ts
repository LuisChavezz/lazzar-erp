//
// ─── Lista de materiales (BOM) por variante de producto ─────────────────────
//

/**
 * Renglón de materia prima dentro de la lista de materiales.
 *
 * Corresponde a cada elemento de `materia_prima_detalle`. Los valores
 * decimales (`cantidad`, `desperdicio`) llegan como string desde el backend
 * (DRF serializa los `DecimalField` como cadenas para no perder precisión).
 */
export interface BomDetalle {
  bom_detalle_id: number;
  /** Cantidad de componente requerida — decimal como string, e.g. "1.58" */
  cantidad: string;
  /** Merma/desperdicio estimado — decimal como string, e.g. "0.00" */
  desperdicio: string;
  obligatorio: boolean;
  observaciones: string | null;
  activo: boolean;
  /** Identificador de la BOM a la que pertenece este renglón */
  bom: number;
  variante_produccion: number | null;
  /** Identificador del componente (producto-variante consumido) */
  componente: number;
  /** Nombre legible del componente — resuelto por el backend */
  componente_nombre: string | null;
  /** Identificador de la unidad de medida */
  unidad: number;
  /** Clave legible de la unidad de medida — resuelta por el backend */
  unidad_clave: string | null;
}

/**
 * Lista de materiales (Bill of Materials) de una variante de producto.
 *
 * Respuesta del endpoint `GET /produccion/lista-material`. El endpoint
 * devuelve un arreglo de `Bom` (ver {@link getBom}).
 */
export interface Bom {
  bom_id: number;
  /** Renglones de materia prima que componen la lista de materiales */
  materia_prima_detalle: BomDetalle[];
  version: number;
  activo: boolean;
  observaciones: string | null;
  empresa: number;
  producto_variante: number;
  variante_produccion: number | null;
}
