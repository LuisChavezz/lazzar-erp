/**
 * Respuestas de las acciones del listado de pedidos en modo servidor
 * (nucleo-erp #969, EC-782): `kpis-mesa/`, `opciones/` y `exportar/`. Las tres
 * pasan por el mismo alcance que `GET /ventas/pedidos/` (`pedidos_visibles` y
 * `?mis_pedidos=`); `kpis-mesa/` y `exportar/` aplican además los mismos
 * filtros y búsqueda que el listado.
 */

/** Pedidos vigentes de UNA moneda dentro del conjunto filtrado. */
export interface PedidoKpisMesaMoneda {
  moneda_id: number;
  /** Código ISO de la moneda (`moneda__codigo_iso`). */
  moneda: string | null;
  /** Pedidos vigentes (sin cancelados) de esa moneda. */
  total: number;
  /**
   * Σ `gran_total` de esos pedidos. AUSENTE (la clave no viene) para quien no
   * ve importes (`puede_ver_importes: false`). El backend lo serializa como
   * número; se acepta también texto por si cambia el encoder.
   */
  valor?: number | string;
}

/**
 * `GET /ventas/pedidos/kpis-mesa/`: conteos del MISMO conjunto que la tabla con
 * los mismos filtros. `total` excluye los cancelados (`estatus` 5) y es
 * `confirmados + por_confirmar`; `cancelados` va aparte y la UI no lo pinta
 * (los cancelados por `POST /cancelar/` quedan `activo=False` y no están en
 * ninguno de los dos; solo cuenta registros antiguos).
 */
export interface PedidoKpisMesa {
  generado_en?: string;
  total: number;
  confirmados: number;
  por_confirmar: number;
  cancelados: number;
  /** Solo monedas con pedidos vigentes. */
  por_moneda: PedidoKpisMesaMoneda[];
  /** Regla de importes de pedidos (contabilidad de ventas o de compras, EC-784). */
  puede_ver_importes: boolean;
}

/** Una opción de un filtro de encabezado, tal como viaja en el query string. */
export interface PedidoFilterOption<TValue extends string | number = string | number> {
  value: TValue;
  label: string;
}

/**
 * `GET /ventas/pedidos/opciones/`: catálogos de los filtros de encabezado sobre
 * TODO el conjunto visible (no reaccionan a los filtros activos; cualquier
 * parámetro distinto de `mis_pedidos` responde 400).
 */
export interface PedidoFilterOptions {
  /** `value` = id del cliente (`?cliente=`). */
  cliente: PedidoFilterOption<number>[];
  /** `value` = id del vendedor de la cotización de origen (`?vendedor=`). */
  vendedor: PedidoFilterOption<number>[];
  /** `value` = "AAAA-MM" de `created_at` (`?mes=`). */
  mes: PedidoFilterOption<string>[];
  /** `value` = "AAAA-MM" de `fecha_confirmacion`, o `"sin_confirmar"` (`?mes_confirmacion=`). */
  mes_confirmacion: PedidoFilterOption<string>[];
  /** `value` = código de clasificación (A–F, X) (`?clasificacion=`). */
  clasificacion: PedidoFilterOption<string>[];
}

/**
 * Renglón de `GET /ventas/pedidos/exportar/`: el conjunto filtrado y ordenado
 * completo, sin paginar, en una sola consulta. `subtotal` y `gran_total` NO
 * vienen para quien no ve importes.
 */
export interface PedidoExportRow {
  id: number;
  folio: string | null;
  estatus: number;
  estatus_display: string;
  oc: string | null;
  cliente: number | null;
  cliente_razon_social: string | null;
  cliente_nombre: string | null;
  created_at: string | null;
  fecha_confirmacion: string | null;
  clasificacion: string | null;
  piezas: number;
  vendedor_nombre: string | null;
  /**
   * Sale de `.values()`, no de un serializer: el encoder JSON de DRF lo manda
   * como NÚMERO (no como el texto decimal del listado). Se acepta cualquiera.
   */
  subtotal?: number | string;
  gran_total?: number | string;
  moneda: number | null;
  moneda_codigo: string | null;
}
