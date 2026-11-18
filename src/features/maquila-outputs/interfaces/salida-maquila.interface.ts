/**
 * SM — salida de prendas a maquila (`/produccion/salidas-maquila/`, nucleo-erp
 * #1076). Documento con folio SM ligado a una OP y a un maquilero; no mueve
 * inventario. Solo pasa de ENVIADA a RECIBIDA (`cerrar/`) o a CANCELADA.
 */
export type SalidaMaquilaEstatus = "ENVIADA" | "RECIBIDA" | "CANCELADA";

export interface SalidaMaquilaDetalle {
  id: number;
  /** Renglón de la OP; `null` si se capturó a mano. */
  op_detalle: number | null;
  descripcion: string;
  cantidad: string;
  /** Ausente para quien no tiene `R-PRODUCCION-COSTOS` (como `importe` y el `total` de la SM). */
  precio_unitario?: string;
  importe?: string;
}

/** Renglón del listado: lo mismo que el detalle sin `detalles`. */
export interface SalidaMaquilaListItem {
  id: number;
  folio: string;
  estatus: SalidaMaquilaEstatus;
  estatus_display: string;
  /** De dónde sale: una OP o una orden de bordado (OB). */
  origen?: "OP" | "OB";
  origen_id?: number;
  origen_folio?: string;
  op: number | null;
  op_folio: string | null;
  ob?: number | null;
  ob_folio?: string | null;
  centro_confeccion: number;
  centro_confeccion_nombre: string;
  sucursal: number;
  fecha_envio: string;
  fecha_compromiso: string | null;
  fecha_recepcion: string | null;
  total_piezas: string;
  /** Ausente para quien no tiene `R-PRODUCCION-COSTOS`. */
  total?: string;
  observaciones: string | null;
  usuario: number | null;
  created_at: string;
}

export interface SalidaMaquila extends SalidaMaquilaListItem {
  detalles: SalidaMaquilaDetalle[];
}

export interface SalidaMaquilaFilters {
  op?: number;
  centro_confeccion?: number;
  estatus?: SalidaMaquilaEstatus;
}

/** Renglón del alta. Sin `precio_unitario` el backend usa el costo de maquila de la OP. */
export interface CreateSalidaMaquilaDetalle {
  op_detalle?: number;
  descripcion?: string;
  cantidad: string;
  precio_unitario?: string;
}

export interface CreateSalidaMaquilaBody {
  op: number;
  /** Se omite para usar el de la OP. */
  centro_confeccion?: number;
  fecha_compromiso?: string;
  observaciones?: string;
  detalles: CreateSalidaMaquilaDetalle[];
}

/**
 * Lo que el alta de una SM necesita de la OP, del retrieve
 * `GET /produccion/orden-produccion/{id}/` (el onboarding no trae los ids de
 * renglón ni el costo de maquila).
 */
export interface OpParaSalidaMaquila {
  op_id: number;
  folio_op: string;
  estatus_op: number;
  /** Maquilero de la OP; `null` si se confecciona en casa. */
  centro_confeccion: number | null;
  /** Precio por pieza que la OP propone; `null` si no se capturó. */
  costo_maquila_unitario: string | null;
  orden_produccion_detalle: OpParaSalidaMaquilaRenglon[];
}

export interface OpParaSalidaMaquilaRenglon {
  op_detalle_id: number;
  cantidad: string;
  activo: boolean;
  producto_variante: {
    sku: string;
    producto_nombre: string;
    talla_nombre: string;
    color_nombre: string;
    /** Clave Proscai del producto; puede venir vacía. */
    cod_proscai?: string | null;
    /** Código del producto. Aún no lo manda el backend (pedido a Jesús). */
    producto_codigo?: string | null;
  } | null;
  variante_produccion?: { sku?: string; nombre?: string } | null;
}
