// Funciones puras de derivación para los KPIs del listado de Órdenes de
// Bordado. Operan sobre `EmbroideryOrder[]` ya cargado por
// `useEmbroideryOrders()` — sin fetch propio, mismo espíritu que
// `computePickingKpis` (picking) / `computePackingKpis` (packing).
//
// No existe endpoint de agregación para este módulo: `OrdenBordadoViewSet`
// solo expone `list`/`retrieve`/`create`/`onboarding` (verificado contra
// `origin/main` del checkout de `nucleo-erp`), así que TODO se deriva aquí
// sobre el arreglo completo que ya devolvió el listado.

import type { EmbroideryOrder } from "../interfaces/embroidery.interface";

export interface EmbroideryKpis {
  /** Conteo simple del listado cargado. */
  totalOrdenes: number;
  /**
   * Suma de `detalles[].cantidad` a través de todas las órdenes — las prendas
   * que realmente hay que bordar. `cantidad` es un `FloatField` del backend
   * (número en el JSON, no el string decimal de inventario), así que se suma
   * directo; se descarta cualquier valor no finito para que un dato corrupto
   * no envenene la suma entera con `NaN` (mismo criterio defensivo que el
   * `Math.max(0, …)` de `computePickingKpis`).
   */
  totalPrendas: number;
  /**
   * Conteo de renglones de `detalles` a través de todas las órdenes. Es un eje
   * DISTINTO de `totalPrendas`: cada renglón es una combinación
   * producto/talla —es decir, un cambio de preparación en máquina—, mientras
   * que `totalPrendas` es el volumen. 3 renglones de 25 pzas y 25 renglones de
   * 3 pzas suman lo mismo pero no cuestan lo mismo de producir.
   * Análogo de `totalLineasEmpacadas` en packing.
   */
  totalRenglones: number;
  /**
   * Pedidos DISTINTOS que abarca el listado.
   *
   * Se agrupa por `pedido` (el id de la FK, siempre presente y no nulo) y NO
   * por `pedido_folio`, que es nullable (`Pedido.folio` lo es en el modelo):
   * agrupar por folio colapsaría todos los pedidos sin folio en un mismo
   * cubo fantasma y subcontaría el total.
   */
  totalPedidos: number;
}

export const computeEmbroideryKpis = (orders: EmbroideryOrder[]): EmbroideryKpis => {
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
