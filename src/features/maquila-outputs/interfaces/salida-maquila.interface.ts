/**
 * SM — salida de prendas a maquila (`/produccion/salidas-maquila/`, nucleo-erp
 * #1076). Documento con folio SM ligado a UNA orden (OP, OB u OR; #1193 y #1216)
 * y a un maquilero; no mueve inventario. Solo pasa de ENVIADA a RECIBIDA (al
 * recepcionarla en WMS, nucleo-erp #1217) o a CANCELADA (`cancelar/`).
 */
export type SalidaMaquilaEstatus = "ENVIADA" | "RECIBIDA" | "CANCELADA";

/** Documento del que sale la SM: orden de producción, de bordado o de reflejante. */
export type SalidaMaquilaOrigen = "OP" | "OB" | "OR";

export interface SalidaMaquilaDetalle {
  id: number;
  /** Renglón de la orden de origen (solo uno va puesto); `null` si se capturó a mano. */
  op_detalle: number | null;
  ob_detalle?: number | null;
  or_detalle?: number | null;
  descripcion: string;
  cantidad: string;
  /** Piezas que ya regresaron de este renglón (retrieve, nucleo-erp #1270). */
  cantidad_recibida?: string;
  /** Piezas que faltan por regresar de este renglón (#1270). */
  cantidad_pendiente?: string;
  /**
   * El backend lo manda siempre (no lo omite sin `R-PRODUCCION-COSTOS`); la UI
   * lo oculta, como `importe` y el `total` de la SM. Se tipa opcional por si
   * el backend empieza a omitirlo.
   */
  precio_unitario?: string;
  importe?: string;
}

/** Renglón del listado: lo mismo que el detalle sin `detalles`. */
export interface SalidaMaquilaListItem {
  id: number;
  /** Folio SM; no cambia. Para pantalla va `folio_display`. */
  folio: string;
  /** "SM-00012 · OR-00006": folio más el de su origen, para mostrar. */
  folio_display?: string;
  estatus: SalidaMaquilaEstatus;
  estatus_display: string;
  /** De dónde sale: OP, OB u OR. */
  origen?: SalidaMaquilaOrigen;
  origen_id?: number;
  origen_folio?: string;
  op: number | null;
  op_folio: string | null;
  ob?: number | null;
  ob_folio?: string | null;
  orden_r?: number | null;
  orden_r_folio?: string | null;
  centro_confeccion: number;
  centro_confeccion_nombre: string;
  sucursal: number;
  fecha_envio: string;
  fecha_compromiso: string | null;
  fecha_recepcion: string | null;
  total_piezas: string;
  /** Piezas que ya regresaron del maquilero (nucleo-erp #1269). */
  piezas_recibidas?: string | number;
  /** En una SM Recibida: lo que no regresó. Abierta: lo que falta por regresar. */
  piezas_faltantes?: string | number;
  /** Ver `precio_unitario`: la UI lo oculta sin `R-PRODUCCION-COSTOS`. */
  total?: string;
  observaciones: string | null;
  usuario: number | null;
  created_at: string;
  /** Folio de la última recepción viva con que regresó (nucleo-erp #1239); `null` si ninguna. */
  recepcion_folio?: string | null;
}

/**
 * Recepción con que regresó la SM (retrieve, nucleo-erp #1239). Incluye las
 * canceladas (`estatus` 6): la UI las atenúa, no las oculta.
 */
export interface SalidaMaquilaRecepcion {
  id: number;
  folio: string | null;
  /** `Recepcion.EstatusRecepcion` (número). */
  estatus: number;
  fecha_recepcion: string | null;
}

/**
 * Factura de maquila que nació de una recepción de la SM (retrieve, #1239).
 * Incluye las canceladas. `folio` es `null` hasta que se captura el del
 * maquilero; `total` (número JSON) llega solo con `R-PRODUCCION-COSTOS`.
 */
export interface SalidaMaquilaFacturaProveedor {
  id: number;
  folio: string | null;
  /** "Borrador" | "Registrada" | "Cancelada", tal cual el backend. */
  estatus: string;
  /** Recepción de la que nació. */
  recepcion: number | null;
  total?: number | string | null;
}

export interface SalidaMaquila extends SalidaMaquilaListItem {
  detalles: SalidaMaquilaDetalle[];
  /** Recepciones con que regresó (retrieve). */
  recepciones?: SalidaMaquilaRecepcion[];
  /** Facturas de maquila de sus recepciones (retrieve). */
  facturas_proveedor?: SalidaMaquilaFacturaProveedor[];
}

export interface SalidaMaquilaFilters {
  origen?: SalidaMaquilaOrigen;
  op?: number;
  ob?: number;
  orden_r?: number;
  centro_confeccion?: number;
  estatus?: SalidaMaquilaEstatus;
}

/**
 * Renglón del alta, con el campo de renglón de su origen (`op_detalle`,
 * `ob_detalle` u `or_detalle`). En OB y OR el precio es obligatorio: esas
 * órdenes no tienen costo de maquila.
 */
export type CreateSalidaMaquilaDetalle = {
  descripcion?: string;
  cantidad: string;
  precio_unitario?: string;
} & ({ op_detalle: number } | { ob_detalle: number } | { or_detalle: number });

/** Exactamente uno de `op`, `ob` u `orden_r`. */
export type CreateSalidaMaquilaBody = {
  /** Siempre lo elegido en el diálogo (en OR es obligatorio). */
  centro_confeccion: number;
  fecha_compromiso?: string;
  observaciones?: string;
  /** Siempre explícitos: en OB y OR un alta sin renglones es un 400. */
  detalles: CreateSalidaMaquilaDetalle[];
} & ({ op: number } | { ob: number } | { orden_r: number });

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
  /** SKU de la variante de producción (fabricación especial, sin `producto_variante`). */
  variante_produccion_sku?: string | null;
}

/**
 * Renglón de la orden de origen, ya traducido para el alta: el id del renglón
 * (`op_detalle_id` de la OP, `id` de los `detalles` de OB y OR), cómo se lee y
 * cuántas piezas tiene.
 */
export interface SalidaMaquilaRenglonOrigen {
  detalleId: number;
  descripcion: string;
  cantidad: number;
}

/** Lo que "Generar SM" necesita de la orden, venga de donde venga. */
export interface SalidaMaquilaOrdenSeed {
  origen: SalidaMaquilaOrigen;
  ordenId: number;
  /** Maquilero propuesto: el de la OP o el proveedor de la OB; la OR no tiene. */
  centroConfeccion: number | null;
  /** Precio por pieza propuesto: el costo de maquila de la OP; OB y OR no tienen. */
  precioSugerido: string | null;
  renglones: SalidaMaquilaRenglonOrigen[];
}
