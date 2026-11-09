import { expect, test } from "@playwright/test";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import {
  GRAN_TOTAL_RANGE_OPTIONS,
  mesaPedidosTable,
  PIEZAS_RANGE_OPTIONS,
  procurementPedidosTable,
  salesPedidosTable,
  SUBTOTAL_RANGE_OPTIONS,
  toPedidoKpisApiParams,
  toPedidoListApiParams,
} from "@/src/features/orders/utils/pedidoListParams";
import {
  purchaseOrderEstatusParamExcept,
  toPurchaseOrderSearchParams,
} from "@/src/features/purchase-orders/utils/purchaseOrderSearchParams";

/**
 * Pruebas unitarias de EC-783: contrato de las listas de pedidos en modo
 * servidor con `GET /ventas/pedidos/` (filtros, rangos, orden) y búsqueda del
 * selector de OC de facturas de proveedor.
 */

const stateOf = (definition: Parameters<typeof readServerTableState>[0], query: string) => {
  const params = new URLSearchParams(query);
  return readServerTableState(definition, (key) => params.get(key));
};

test.describe("toPedidoListApiParams", () => {
  test("traduce cada `rango_*` a los parámetros del backend", () => {
    expect(toPedidoListApiParams({ rango_piezas: "51-500" })).toEqual({
      piezas_min: "51",
      piezas_max: "501",
    });
    expect(toPedidoListApiParams({ rango_piezas: "muestras-solo" })).toEqual({ muestras: "solo" });
    expect(toPedidoListApiParams({ rango_subtotal: "mas-100k" })).toEqual({ subtotal_min: "100000" });
    expect(toPedidoListApiParams({ rango_gran_total: "cero" })).toEqual({ gran_total_max: "0.01" });
  });

  test("los demás parámetros pasan igual, también la paginación", () => {
    expect(
      toPedidoListApiParams({ q: "P-1", vendedor: "7", ordering: "-piezas,-id", limit: 20, offset: 40 }),
    ).toEqual({ q: "P-1", vendedor: "7", ordering: "-piezas,-id", limit: 20, offset: 40 });
  });

  test("una opción de rango desconocida no llega al backend", () => {
    expect(toPedidoListApiParams({ rango_piezas: "otro", q: "x" })).toEqual({ q: "x" });
  });

  test("ningún rango cruza mínimo y máximo (mín. inclusivo, máx. exclusivo)", () => {
    for (const options of [PIEZAS_RANGE_OPTIONS, SUBTOTAL_RANGE_OPTIONS, GRAN_TOTAL_RANGE_OPTIONS]) {
      for (const { params } of options) {
        const [min] = Object.entries(params).filter(([key]) => key.endsWith("_min"));
        const [max] = Object.entries(params).filter(([key]) => key.endsWith("_max"));
        if (min && max) expect(Number(min[1])).toBeLessThan(Number(max[1]));
      }
    }
  });
});

test.describe("toPedidoKpisApiParams", () => {
  test("los mismos criterios de la tabla, traducidos y sin `ordering`", () => {
    expect(
      toPedidoKpisApiParams({ confirmado: "true", rango_piezas: "1-50", q: "acme", ordering: "-created_at,-id" }),
    ).toEqual({ confirmado: "true", piezas_max: "51", q: "acme" });
  });
});

test.describe("definiciones de las listas", () => {
  test("Mesa: vendedor por id, clasificación CSV y orden con desempate", () => {
    const state = stateOf(mesaPedidosTable, "vendedor=12&clasificacion=b,A&confirmado=false&mes=2026-10");
    // `clasificacion` en minúsculas no es válida: el códec compara exacto.
    expect(state.filters).toEqual({ vendedor: 12, confirmado: "false", mes: "2026-10" });
    expect(toServerTableCriteria(mesaPedidosTable, state)).toEqual({
      vendedor: "12",
      confirmado: "false",
      mes: "2026-10",
      ordering: "-created_at,-id",
    });
    const csv = stateOf(mesaPedidosTable, "clasificacion=B,A");
    expect(toServerTableCriteria(mesaPedidosTable, csv).clasificacion).toBe("A,B");
  });

  test("Mesa: un vendedor por nombre (no id) se trata como ausente", () => {
    expect(stateOf(mesaPedidosTable, "vendedor=Juan%20P%C3%A9rez").filters).toEqual({});
  });

  test("Mesa: \"Programado\" no se ordena (no coincide con lo que se ve)", () => {
    expect(mesaPedidosTable.ordering?.fields).not.toContain("piezas_programadas");
    expect(stateOf(mesaPedidosTable, "ordering=-piezas_programadas").ordering).toBeNull();
  });

  test("Compras: estatus CSV y mes de confirmación con \"sin confirmar\"", () => {
    const state = stateOf(procurementPedidosTable, "estatus=4,3&mes_confirmacion=sin_confirmar");
    expect(toServerTableCriteria(procurementPedidosTable, state)).toEqual({
      estatus: "3,4",
      mes_confirmacion: "sin_confirmar",
      ordering: "-created_at,-id",
    });
    expect(stateOf(procurementPedidosTable, "estatus=6").filters).toEqual({});
  });

  test("Mis pedidos: confirmado y mes; ordena por piezas, vendedor e importe", () => {
    expect(salesPedidosTable.ordering?.fields).toEqual(
      expect.arrayContaining(["piezas", "vendedor_nombre", "subtotal"]),
    );
    const state = stateOf(salesPedidosTable, "confirmado=true&mes=2026-11&ordering=-subtotal");
    expect(toServerTableCriteria(salesPedidosTable, state)).toEqual({
      confirmado: "true",
      mes: "2026-11",
      ordering: "-subtotal,-id",
    });
  });
});

test.describe("búsqueda de OC del selector de facturas de proveedor", () => {
  test("estatus por exclusión: todo menos cancelada", () => {
    expect(purchaseOrderEstatusParamExcept([6])).toBe("1,2,3,4,5");
  });

  test("con proveedor y `limit` siempre; `search` solo con valor", () => {
    expect(toPurchaseOrderSearchParams({ search: "", estatus: "1,2,3,4,5", conProveedor: true })).toEqual({
      estatus: "1,2,3,4,5",
      con_proveedor: "true",
      limit: 50,
    });
    expect(toPurchaseOrderSearchParams({ search: "OC-1" })).toEqual({ search: "OC-1", limit: 50 });
  });
});
