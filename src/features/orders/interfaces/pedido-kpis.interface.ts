/**
 * `GET /ventas/pedidos/kpis/`: indicadores de "Mis pedidos" que CALCULA el
 * backend en cada lectura. Aquí no se recalcula nada; la UI pinta los valores
 * tal cual.
 *
 * Alcance fijo: los pedidos propios del usuario autenticado
 * (`cotizacion__vendedor`) dentro de su empresa, todo el histórico. El endpoint
 * no acepta parámetros (cualquiera se ignora) y no expone metas ni semáforo.
 *
 * Cada bloque es una unión discriminada sobre `disponible`: CUALQUIERA de los
 * cuatro puede llegar como `{ disponible: false, motivo }` (p. ej. un usuario
 * sin empresa recibe los cuatro así). La UI decide solo por esa bandera, nunca
 * por el nombre del bloque.
 */

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface PedidoKpiUnavailable {
  disponible: false;
  motivo: string;
}

/** Pedido activo (estatus 3 AUTORIZADA o 4 EN PROCESO) del drill-down. */
export interface PedidoKpiActiveOrder {
  id: number;
  folio: string | null;
  estatus: number;
  /**
   * Etiqueta del backend ("AUTORIZADA"). Parte del contrato, pero la UI pinta
   * la de `getPedidoEstatusConfig(estatus)`, igual que el resto de pedidos.
   */
  estatus_label: string;
  /** NÚMERO JSON (no string como en el listado), en la moneda `moneda` del pedido. */
  gran_total: number;
  cliente_nombre: string | null;
  /** Código ISO de la moneda del pedido ("MXN", "USD"…); catálogo abierto. */
  moneda: string;
}

/**
 * Pedidos activos de UNA moneda. `valor` es `Sum(gran_total)` de esos pedidos
 * (número JSON); los de otra moneda van en su propia fila y nunca se suman.
 */
export interface PedidoActiveKpiCurrency {
  moneda: string;
  total: number;
  valor: number;
}

export interface PedidoActiveKpiAvailable {
  disponible: true;
  /** Conteo de pedidos activos de TODAS las monedas (suma de `por_moneda[].total`). */
  total: number;
  /** Una fila por moneda, ordenada por código; vacía sin pedidos activos. */
  por_moneda: PedidoActiveKpiCurrency[];
  /**
   * Como MÁXIMO 20 filas, ordenadas por `-gran_total, -id` sin convertir
   * monedas, sin paginación.
   */
  drill_down: PedidoKpiActiveOrder[];
  /** Total de pedidos del drill-down (igual a `total`). */
  drill_down_total: number;
  /** `true` si el backend cortó `drill_down` (hay más pedidos que filas). */
  drill_down_truncado: boolean;
}

/**
 * OTIF, lead time promedio y pedidos en riesgo: hoy SIEMPRE llegan no
 * disponibles. Su forma disponible aún no existe en el contrato, así que no se
 * tipa ningún campo: solo la bandera.
 */
export interface PedidoKpiPendingContract {
  disponible: true;
}

export type PedidoActiveKpi = PedidoActiveKpiAvailable | PedidoKpiUnavailable;
export type PedidoUntypedKpi = PedidoKpiPendingContract | PedidoKpiUnavailable;

export interface PedidoKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  pedidos_activos: PedidoActiveKpi;
  otif: PedidoUntypedKpi;
  lead_time_promedio: PedidoUntypedKpi;
  pedidos_en_riesgo: PedidoUntypedKpi;
}
