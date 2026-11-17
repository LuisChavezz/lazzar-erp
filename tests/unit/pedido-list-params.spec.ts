import { expect, test } from "@playwright/test";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import {
  GRAN_TOTAL_RANGE_OPTIONS,
  mesaPedidosTable,
  PIEZAS_RANGE_OPTIONS,
  procurementPedidosTable,
  salesPedidosTable,
  SALES_VIRTUAL_FILTER_VALUES,
  SIN_CLASIFICACION,
  SUBTOTAL_RANGE_OPTIONS,
  toPedidoKpisApiParams,
  toPedidoListApiParams,
  withoutAmountCriteria,
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

/** URL de la tabla → parámetros que llegan al backend (sin paginación). */
const apiParamsOf = (definition: Parameters<typeof readServerTableState>[0], query: string) =>
  toPedidoListApiParams(toServerTableCriteria(definition, stateOf(definition, query)));

/** Lo mismo para Mis pedidos, con SUS valores virtuales (como `SalesOrderList`). */
const salesParamsOf = (query: string) =>
  toPedidoListApiParams(
    toServerTableCriteria(salesPedidosTable, stateOf(salesPedidosTable, query)),
    SALES_VIRTUAL_FILTER_VALUES,
  );

test.describe("Mis pedidos: estatus y clasificación (EC-755)", () => {
  test("estatus CSV, «Cancelado» incluido (`estatus=5`)", () => {
    expect(salesParamsOf("estatus=5")).toEqual({
      estatus: "5",
      ordering: "-created_at,-id",
    });
    expect(salesParamsOf("estatus=4,3").estatus).toBe("3,4");
    expect(stateOf(salesPedidosTable, "estatus=6").filters).toEqual({});
  });

  test("«Sin clasificación» se envía como `sin_clasificar=true`, sin `clasificacion`", () => {
    const state = stateOf(salesPedidosTable, `clasificacion=${SIN_CLASIFICACION}`);
    // La URL conserva la opción virtual (ida y vuelta).
    expect(toServerTableCriteria(salesPedidosTable, state).clasificacion).toBe(SIN_CLASIFICACION);
    expect(salesParamsOf(`clasificacion=${SIN_CLASIFICACION}`)).toEqual({
      sin_clasificar: "true",
      ordering: "-created_at,-id",
    });
  });

  test("los códigos pasan como CSV normalizado; un valor inválido o mezclado se descarta", () => {
    expect(salesParamsOf("clasificacion=B,A").clasificacion).toBe("A,B");
    for (const raw of ["a", "A,Z", `A,${SIN_CLASIFICACION}`, ""]) {
      const params = salesParamsOf(`clasificacion=${encodeURIComponent(raw)}`);
      expect(params).not.toHaveProperty("clasificacion");
      expect(params).not.toHaveProperty("sin_clasificar");
    }
  });

  test("se combina con `q`, `mes`, `confirmado` y el orden por confirmación o estatus", () => {
    expect(
      salesParamsOf(
        `q=acme&mes=2026-11&confirmado=false&estatus=3&clasificacion=${SIN_CLASIFICACION}&ordering=fecha_confirmacion`,
      ),
    ).toEqual({
      q: "acme",
      mes: "2026-11",
      confirmado: "false",
      estatus: "3",
      sin_clasificar: "true",
      ordering: "fecha_confirmacion,-id",
    });
    expect(salesParamsOf("ordering=-estatus").ordering).toBe("-estatus,-id");
  });

  test("sin permiso de importes se conservan estatus y clasificación", () => {
    const definition = withoutAmountCriteria(salesPedidosTable);
    expect(Object.keys(definition.filters)).toEqual(["estatus", "confirmado", "mes", "clasificacion"]);
    expect(definition.ordering?.fields).not.toContain("subtotal");
  });
});

test.describe("Mesa de Control y Compras no cambian con EC-755", () => {
  test("sin los valores virtuales de Mis pedidos no se traduce nada (opt-in por lista)", () => {
    // Aunque un códec dejara pasar el valor, una lista que no pasa
    // `SALES_VIRTUAL_FILTER_VALUES` lo enviaría tal cual, nunca `sin_clasificar`.
    expect(toPedidoListApiParams({ clasificacion: SIN_CLASIFICACION })).toEqual({
      clasificacion: SIN_CLASIFICACION,
    });
    expect(toPedidoListApiParams({ clasificacion: "A,C" }, SALES_VIRTUAL_FILTER_VALUES)).toEqual({
      clasificacion: "A,C",
    });
  });

  test("los indicadores de Mesa reciben los mismos parámetros que antes", () => {
    const criteria = toServerTableCriteria(
      mesaPedidosTable,
      stateOf(mesaPedidosTable, "clasificacion=C,A&rango_piezas=1-50&confirmado=false&q=x&ordering=piezas"),
    );
    expect(toPedidoKpisApiParams(criteria)).toEqual({
      clasificacion: "A,C",
      piezas_max: "51",
      confirmado: "false",
      q: "x",
    });
  });

  test("Mesa: «Sin clasificación» no es un valor válido y nunca envía `sin_clasificar`", () => {
    expect(stateOf(mesaPedidosTable, `clasificacion=${SIN_CLASIFICACION}`).filters).toEqual({});
    expect(apiParamsOf(mesaPedidosTable, `clasificacion=${SIN_CLASIFICACION}`)).toEqual({
      ordering: "-created_at,-id",
    });
  });

  test("las definiciones conservan sus filtros y su orden", () => {
    expect(Object.keys(mesaPedidosTable.filters)).toEqual([
      "confirmado",
      "cliente",
      "vendedor",
      "mes",
      "clasificacion",
      "rango_piezas",
      "rango_subtotal",
    ]);
    expect(mesaPedidosTable.ordering?.fields).toEqual([
      "folio",
      "cliente_razon_social",
      "piezas",
      "piezas_surtidas",
      "vendedor_nombre",
      "created_at",
      "clasificacion",
      "subtotal",
    ]);
    expect(Object.keys(procurementPedidosTable.filters)).toEqual([
      "estatus",
      "cliente",
      "mes",
      "mes_confirmacion",
      "rango_gran_total",
    ]);
    expect(procurementPedidosTable.ordering?.fields).toEqual([
      "folio",
      "cliente_razon_social",
      "created_at",
      "fecha_confirmacion",
      "gran_total",
    ]);
  });

  test("los mismos parámetros que antes para una URL con todos sus filtros", () => {
    expect(
      apiParamsOf(
        mesaPedidosTable,
        "confirmado=true&cliente=7&vendedor=12&mes=2026-10&clasificacion=C,A&rango_piezas=51-500&rango_subtotal=mas-100k&q=x&ordering=piezas",
      ),
    ).toEqual({
      confirmado: "true",
      cliente: "7",
      vendedor: "12",
      mes: "2026-10",
      clasificacion: "A,C",
      piezas_min: "51",
      piezas_max: "501",
      subtotal_min: "100000",
      q: "x",
      ordering: "piezas,-id",
    });
    expect(
      apiParamsOf(
        procurementPedidosTable,
        "estatus=5&cliente=7&mes=2026-10&mes_confirmacion=sin_confirmar&rango_gran_total=cero&ordering=-gran_total",
      ),
    ).toEqual({
      estatus: "5",
      cliente: "7",
      mes: "2026-10",
      mes_confirmacion: "sin_confirmar",
      gran_total_max: "0.01",
      ordering: "-gran_total,-id",
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
