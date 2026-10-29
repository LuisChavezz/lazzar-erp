import type { PedidoProgramarRenglon } from "../interfaces/pedido-programacion.interface";

/**
 * Cobertura de existencia de "Programar pedido", por talla y por partida,
 * calculada SOLO con `GET /ventas/pedidos/{id}/programar/`. El stock lo da el
 * backend ya repartido por talla (`stock_disponible` = lo que le queda a esa
 * talla en `almacen_surtido`, descontadas las reservas de otros pedidos); aquí
 * nunca se suma ni se reparte stock, solo se compara con lo pedido.
 *
 * Una talla con `stock_disponible === null` no se puede medir: si su línea es
 * de muestra no se surte del almacén; si no lo es (sin producto, o talla sin
 * variante de un producto con variantes), queda "sin medir".
 */

export type TallaCoverage = "full" | "partial" | "none";

/**
 * Estado de una partida de catálogo: las tres de la talla más `unmeasured`
 * ("Sin medir"), cuando alguna de sus tallas no trae stock. Las partidas de
 * muestra no tienen estado (`null`).
 */
export type PartidaCoverage = TallaCoverage | "unmeasured";

/** Talla con existencia que medir (`stock_disponible` no nulo). */
type RenglonConStock = PedidoProgramarRenglon & { stock_disponible: number };

export const tieneStock = (renglon: PedidoProgramarRenglon): renglon is RenglonConStock =>
  renglon.stock_disponible !== null;

/** Talla de catálogo sin stock que comparar: no es muestra y llega en `null`. */
const esSinMedir = (renglon: PedidoProgramarRenglon) =>
  !renglon.es_muestra && !tieneStock(renglon);

/** Cubierta si el stock alcanza, sin disponible si es 0, parcial en otro caso. */
export const getTallaCoverage = (renglon: RenglonConStock): TallaCoverage => {
  if (renglon.stock_disponible >= renglon.cantidad) return "full";
  if (renglon.stock_disponible <= 0) return "none";
  return "partial";
};

/** Disponible menos lo pedido: positiva sobra, negativa falta. */
export const getTallaDiferencia = (renglon: RenglonConStock): number =>
  renglon.stock_disponible - renglon.cantidad;

/** Suma de `faltante` del backend (las tallas sin stock no aportan). */
const sumFaltante = (renglones: PedidoProgramarRenglon[]) =>
  renglones.reduce((sum, renglon) => sum + (renglon.faltante ?? 0), 0);

export interface ProgramarPartida {
  /** `pedido_detalle_id` de sus tallas. */
  id: number;
  /** De la primera talla: la partida no trae datos propios en el GET. */
  producto: string | null;
  color: string | null;
  renglones: PedidoProgramarRenglon[];
  /** La muestra es de la línea (`PedidoDetalle`): todas sus tallas la comparten. */
  esMuestra: boolean;
  /** `null` en las partidas de muestra. */
  coverage: PartidaCoverage | null;
  /** "Faltan N": suma de `faltante` de sus tallas medidas. */
  faltan: number;
}

/**
 * Cobertura de una partida de catálogo: "Sin medir" si alguna talla no trae
 * stock (nunca cuenta como cubierta), y si no, cubierta si todas lo están, sin
 * disponible si ninguna tiene, parcial en otro caso.
 */
const getPartidaCoverage = (renglones: PedidoProgramarRenglon[]): PartidaCoverage => {
  const coverages: TallaCoverage[] = [];
  for (const renglon of renglones) {
    if (!tieneStock(renglon)) return "unmeasured";
    coverages.push(getTallaCoverage(renglon));
  }
  if (coverages.every((coverage) => coverage === "full")) return "full";
  if (coverages.every((coverage) => coverage === "none")) return "none";
  return "partial";
};

/**
 * Agrupa las tallas por `pedido_detalle_id` respetando el orden del GET (orden
 * de primera aparición de cada partida y de sus tallas dentro de ella).
 */
export const groupRenglonesPorPartida = (
  renglones: PedidoProgramarRenglon[],
): ProgramarPartida[] => {
  const grupos = new Map<number, PedidoProgramarRenglon[]>();
  for (const renglon of renglones) {
    const grupo = grupos.get(renglon.pedido_detalle_id);
    if (grupo) grupo.push(renglon);
    else grupos.set(renglon.pedido_detalle_id, [renglon]);
  }
  return Array.from(grupos, ([id, tallas]) => {
    const esMuestra = tallas.some((renglon) => renglon.es_muestra);
    return {
      id,
      producto: tallas[0].producto,
      color: tallas[0].color,
      renglones: tallas,
      esMuestra,
      coverage: esMuestra ? null : getPartidaCoverage(tallas),
      faltan: esMuestra ? 0 : sumFaltante(tallas),
    };
  });
};

export interface ProgramarStockResumen {
  /**
   * Piezas cubiertas / piezas pedidas de las tallas medidas, redondeado hacia
   * abajo (99.7 → 99). `null` si no hay ninguna talla medida.
   */
  percent: number | null;
  /** Partidas de catálogo cubiertas (las "Sin medir" nunca lo están). */
  partidasCubiertas: number;
  /** Partidas de catálogo: las de muestra no cuentan. */
  partidasTotal: number;
  /** Suma de `faltante` del backend. */
  piezasFaltantes: number;
  /**
   * Todo el pedido está cubierto: todas sus partidas de catálogo lo están (y,
   * por tanto, ninguna talla quedó sin medir).
   */
  pedidoCubierto: boolean;
}

/** `null` cuando no hay partidas de catálogo (pedido vacío o solo muestras). */
export const getProgramarStockResumen = (
  partidas: ProgramarPartida[],
): ProgramarStockResumen | null => {
  const catalogo = partidas.filter((partida) => !partida.esMuestra);
  if (catalogo.length === 0) return null;
  const medidas = catalogo.flatMap((partida) => partida.renglones).filter(tieneStock);
  const requested = medidas.reduce((sum, renglon) => sum + renglon.cantidad, 0);
  const covered = medidas.reduce(
    (sum, renglon) => sum + Math.min(renglon.stock_disponible, renglon.cantidad),
    0,
  );
  const partidasCubiertas = catalogo.filter((partida) => partida.coverage === "full").length;
  return {
    percent: requested > 0 ? Math.floor((covered / requested) * 100) : null,
    partidasCubiertas,
    partidasTotal: catalogo.length,
    piezasFaltantes: sumFaltante(medidas),
    pedidoCubierto: partidasCubiertas === catalogo.length,
  };
};

/** Tallas que quedan fuera del resumen, para la nota bajo las tarjetas. */
export interface ProgramarTallasExcluidas {
  /** Tallas de muestra: no se surten del almacén. */
  muestra: number;
  /** Tallas de catálogo sin stock que consultar: no se sabe si están cubiertas. */
  sinMedir: number;
}

export const getProgramarTallasExcluidas = (
  renglones: PedidoProgramarRenglon[],
): ProgramarTallasExcluidas => ({
  muestra: renglones.filter((renglon) => renglon.es_muestra).length,
  sinMedir: renglones.filter(esSinMedir).length,
});
