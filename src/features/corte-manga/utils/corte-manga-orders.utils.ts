// Funciones puras de derivación para los KPIs del listado de Órdenes de Corte
// de Manga. Operan sobre `CorteMangaOrder[]` ya cargado por
// `useCorteMangaOrders()` — sin fetch propio, mismo espíritu que
// `computeReflectiveOrderKpis` (reflejante) / `computeEmbroideryKpis` (bordado).
//
// No existe endpoint de agregación para este módulo: `OrdenesCorteMangaViewSet`
// solo expone `list`/`retrieve`/`create`/`destroy`/`onboarding` (verificado
// contra el esquema OpenAPI desplegado y contra el checkout de `nucleo-erp`),
// así que TODO se deriva aquí sobre el arreglo completo que ya devolvió el
// listado.

import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

export interface CorteMangaOrderKpis {
  /** Conteo simple del listado cargado. */
  totalOrdenes: number;
  /**
   * Suma de `detalles[].cantidad` a través de todas las órdenes — las prendas a
   * las que realmente hay que cortarles la manga. `cantidad` es un
   * `FloatField` del backend (número en el JSON, no el string decimal de
   * inventario), así que se suma directo; se descarta cualquier valor no finito
   * para que un dato corrupto no envenene la suma entera con `NaN`.
   */
  totalPrendas: number;
  /**
   * Conteo de renglones de `detalles` a través de todas las órdenes. Es un eje
   * DISTINTO de `totalPrendas`: cada renglón es una combinación producto/talla
   * —es decir, un cambio de preparación en el área—, mientras que
   * `totalPrendas` es el volumen. 3 renglones de 25 pzas y 25 renglones de 3
   * pzas suman lo mismo pero no cuestan lo mismo de producir.
   */
  totalRenglones: number;
  /**
   * Pedidos DISTINTOS que abarca el listado.
   *
   * Se agrupa por `pedido` (el id de la FK, siempre presente y no nulo) y NO
   * por `pedido_folio`, que es nullable (`Pedido.folio` lo es en el modelo):
   * agrupar por folio colapsaría todos los pedidos sin folio en un mismo cubo
   * fantasma y subcontaría el total.
   *
   * OJO: hoy el backend impide más de una orden ACTIVA por pedido (constraint
   * `uq_orden_corte_manga_activa_por_pedido` + guardia 409 del service), así
   * que este número debería coincidir con `totalOrdenes`. Se calcula igual, y
   * no se asume la igualdad: la constraint es reciente (migración `0022`) y los
   * datos anteriores pueden traer duplicados históricos.
   */
  totalPedidos: number;
}

export const computeCorteMangaOrderKpis = (
  orders: CorteMangaOrder[],
): CorteMangaOrderKpis => {
  let totalPrendas = 0;
  let totalRenglones = 0;
  const pedidos = new Set<number>();

  for (const order of orders) {
    pedidos.add(order.pedido);
    totalRenglones += order.detalles.length;

    for (const linea of order.detalles) {
      if (Number.isFinite(linea.cantidad)) totalPrendas += linea.cantidad;
    }
  }

  return {
    totalOrdenes: orders.length,
    totalPrendas,
    totalRenglones,
    totalPedidos: pedidos.size,
  };
};
