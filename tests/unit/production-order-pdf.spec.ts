import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { AxiosError, type AxiosResponse } from "axios";
import { labelConsumptionRecords } from "@/src/features/production-order-consumption/utils/consumptionRecords";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import type {
  ProductionOrderConsumoResumen,
  ProductionOrderOnboarding,
} from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  productionOrderPdfDescriptor,
  productionOrderPdfHabilitacion,
  productionOrderPdfPedidos,
  type ProductionOrderPdfHabilitacionRow,
  type ProductionOrderPdfPedido,
} from "@/src/features/production-orders/utils/productionOrderPdf";
import { productionOrderPdfSource } from "@/src/features/production-orders/utils/productionOrderPdfSource";
import { ProductionOrderPdfDocument } from "@/src/pdfs/ProductionOrderPdfDocument";
import { DocumentPdfLayout } from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { elementsOf, pdfCardItems, pdfTable } from "./support/pdfElementTree";

/**
 * PDF de la orden de producción (EC-857): identidad y nombre del archivo,
 * pedidos con su cliente, habilitación con desperdicio, el resumen de consumos
 * del backend (`consumos_resumen`, sin recalcular) y que la descarga no toque
 * la consulta de la página. Sin red: `v1_api.get` se sustituye y el documento
 * se recorre como árbol de elementos.
 */

const cliente = (id: number, nombre: string, razon_social: string | null, rfc: string | null) => ({
  id,
  nombre,
  razon_social,
  rfc,
});

/** Forma real de `onboarding/?op_id=` (EC-880), con valores de prueba. */
const op = (overrides: Partial<ProductionOrderOnboarding> = {}): ProductionOrderOnboarding => ({
  op_id: 72,
  folio_op: "2026-OP-00045",
  estatus_op: 1,
  estatus_op_display: "Pendiente",
  prioridad: 1,
  fecha_inicio: "2026-11-10T11:40:51.870164-06:00",
  fecha_fin: null,
  observaciones: "Urgente",
  cerrar_orden: false,
  activo: true,
  empresa: 1,
  empresa_nombre: "LAZZAR",
  sucursal: 1,
  sucursal_nombre: "Toneles",
  pedido: 2122,
  pedido_folio: "P-00168-2026",
  ruta_produccion: null,
  usuario_asignado: 4,
  usuario_nombre: "Operador Uno",
  pedido_vinculado: {
    id: 2122,
    folio: "P-00168-2026",
    cliente: cliente(10, "JESUS IBARRA", "MDDVVM CASSETTE", "IAMJ951203BC6"),
  },
  pedidos: [
    { id: 2122, folio: "P-00168-2026", cliente: cliente(10, "JESUS IBARRA", "MDDVVM CASSETTE", "IAMJ951203BC6") },
  ],
  fecha_pedido: "2026-11-10",
  fecha_vence: "2027-03-30",
  fecha_entrega_estimada: null,
  op_info: "2026-OP-00045",
  productos: [
    {
      nombre: "CHAMARRA",
      cantidades: { total: 7, tallas: [{ talla: "CH", color: "NEGRO", cantidad: 7 }] },
      habilitacion: [
        { codigo: "2CES85AMA", descripcion: "CIERRE", unidad: "PZ", total: 14 },
        { codigo: "2EL14-BLA", descripcion: "ELASTICO", unidad: "M", total: 7 },
      ],
      habilitacion_con_desperdicio: [
        { codigo: "2CES85AMA", descripcion: "CIERRE", unidad: "PZ", total: "14.0000" },
        { codigo: "2EL14-BLA", descripcion: "ELASTICO", unidad: "M", total: "7.3500" },
      ],
    },
  ],
  consumos: [],
  consumos_resumen: [],
  ...overrides,
});

const fileNameOf = (detail: Pick<ProductionOrderOnboarding, "op_id" | "folio_op" | "estatus_op">) => {
  const descriptor = productionOrderPdfDescriptor(detail);
  return documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);
};

test.describe("productionOrderPdfDescriptor", () => {
  test("código OP con el folio del backend; sin folio, OP-ID<id>", () => {
    expect(productionOrderPdfDescriptor(op())).toEqual({
      type: "OP",
      id: 72,
      folio: "2026-OP-00045",
      cancelled: false,
    });
    // El folio de producción empieza con el año: no con "OP-", así que lleva el código.
    expect(fileNameOf(op())).toBe("OP-2026-OP-00045.pdf");
    expect(fileNameOf(op({ folio_op: "" }))).toBe("OP-ID72.pdf");
  });

  test("una OP cancelada (7) se descarga con la marca; las demás no", () => {
    expect(productionOrderPdfDescriptor(op({ estatus_op: 7 })).cancelled).toBe(true);
    for (const estatus of [1, 2, 3, 4, 5, 6]) {
      expect(productionOrderPdfDescriptor(op({ estatus_op: estatus })).cancelled).toBe(false);
    }
  });
});

function documentOf(detail: ProductionOrderOnboarding) {
  const root = ProductionOrderPdfDocument({ op: detail, company: { name: "LAZZAR MEXICO", rfc: null } });
  const elements = elementsOf(root);
  const layout = elements.find((element) => element.type === DocumentPdfLayout);
  const card = (title: string) =>
    Object.fromEntries(pdfCardItems(elements, title).map((item) => [item.label, item.value]));
  return { elements, layoutProps: layout?.props ?? {}, card };
}

const cells = <Row,>(table: ReturnType<typeof pdfTable<Row>>) =>
  table.rows.map((row, index) =>
    Object.fromEntries(table.columns.map((column) => [column.header, column.cell(row, index)])),
  );

test.describe("ProductionOrderPdfDocument", () => {
  test("una OP con varios pedidos lista cada uno con SU cliente", () => {
    const detail = op({
      pedidos: [
        { id: 2122, folio: "P-00168-2026", cliente: cliente(10, "JESUS IBARRA", "MDDVVM CASSETTE", "IAMJ951203BC6") },
        { id: 2130, folio: null, cliente: cliente(15, "Luis Ceja", null, null) },
        // Repetido: no se lista dos veces.
        { id: 2122, folio: "P-00168-2026", cliente: cliente(10, "JESUS IBARRA", "MDDVVM CASSETTE", "IAMJ951203BC6") },
      ],
    });
    const doc = documentOf(detail);
    const table = pdfTable<ProductionOrderPdfPedido>(doc.elements, "PEDIDOS");
    expect(table.columns.map((column) => column.header)).toEqual(["Pedido", "Cliente", "Razón social", "RFC"]);
    expect(cells(table)).toEqual([
      { Pedido: "P-00168-2026", Cliente: "JESUS IBARRA", "Razón social": "MDDVVM CASSETTE", RFC: "IAMJ951203BC6" },
      { Pedido: "Pedido #2130", Cliente: "Luis Ceja", "Razón social": "—", RFC: "—" },
    ]);
    // Subtítulo y pie: los clientes distintos, en orden.
    expect(doc.layoutProps.subtitle).toBe("MDDVVM CASSETTE · Luis Ceja");
  });

  test("sin la clave cliente (respuesta previa a EC-880) se omiten sus columnas", () => {
    const doc = documentOf(op({ pedidos: [{ id: 2122, folio: "P-00168-2026" }] }));
    const table = pdfTable<ProductionOrderPdfPedido>(doc.elements, "PEDIDO");
    expect(table.columns.map((column) => column.header)).toEqual(["Pedido"]);
    expect(doc.layoutProps.subtitle).toBeNull();
  });

  test("sin pedidos cae al pedido único y, sin pedido, la tabla queda vacía", () => {
    expect(productionOrderPdfPedidos(op({ pedidos: [] }))).toEqual([op().pedido_vinculado]);
    expect(
      productionOrderPdfPedidos(op({ pedidos: undefined, pedido_vinculado: undefined })),
    ).toEqual([{ id: 2122, folio: "P-00168-2026" }]);
    expect(
      productionOrderPdfPedidos(op({ pedidos: [], pedido_vinculado: null, pedido: null, pedido_folio: null })),
    ).toEqual([]);
  });

  test("una OP cancelada se dibuja con el descriptor cancelado de la base", () => {
    const doc = documentOf(op({ estatus_op: 7, estatus_op_display: "Cancelado" }));
    expect((doc.layoutProps.descriptor as { cancelled: boolean }).cancelled).toBe(true);
    expect(doc.card("DATOS DE LA ORDEN").Estatus).toBe("Cancelado");
  });

  test("fechas del pedido y entrega estimada; sin las claves, no hay renglón", () => {
    const seguimiento = documentOf(op()).card("ORIGEN Y SEGUIMIENTO");
    expect(seguimiento["Fecha del pedido"]).toBe("10 nov 2026");
    expect(seguimiento.Vence).toBe("30 mar 2027");
    expect(seguimiento["Entrega estimada"]).toBe("—");
    const sinClaves = documentOf(
      op({ fecha_pedido: undefined, fecha_vence: undefined, fecha_entrega_estimada: undefined }),
    ).card("ORIGEN Y SEGUIMIENTO");
    expect(Object.keys(sinClaves)).toEqual(["Operador asignado", "Empresa", "Sucursal"]);
  });

  test("no imprime costo_maquila_unitario aunque venga en la respuesta", () => {
    const detail = { ...op(), costo_maquila_unitario: "125.5000" } as ProductionOrderOnboarding;
    const text = JSON.stringify(
      documentOf(detail).elements.map((element) => element.props.items ?? element.props.title ?? null),
    );
    expect(text).not.toContain("125.5");
    expect(text).not.toContain("maquila");
  });
});

test.describe("habilitación con desperdicio", () => {
  test("se busca por material, sin calcular; la columna se omite sin la lista", () => {
    const [producto] = op().productos;
    expect(productionOrderPdfHabilitacion(producto).map((row) => row.total_con_desperdicio)).toEqual([
      "14.0000",
      "7.3500",
    ]);
    const table = pdfTable<ProductionOrderPdfHabilitacionRow>(
      documentOf(op()).elements,
      "CHAMARRA · HABILITACIÓN",
    );
    expect(table.columns.map((column) => column.header)).toEqual([
      "Código",
      "Descripción",
      "Unidad",
      "Total",
      "Con desperdicio",
    ]);
    expect(cells(table)[1]).toMatchObject({ Total: "7", "Con desperdicio": "7.35" });

    const sinLista = op({
      productos: [{ ...producto, habilitacion_con_desperdicio: undefined }],
    });
    const sinColumna = pdfTable<ProductionOrderPdfHabilitacionRow>(
      documentOf(sinLista).elements,
      "CHAMARRA · HABILITACIÓN",
    );
    expect(sinColumna.columns.map((column) => column.header)).not.toContain("Con desperdicio");
  });

  test("un material ausente de la lista con desperdicio sale con guion", () => {
    const [producto] = op().productos;
    const rows = productionOrderPdfHabilitacion({
      ...producto,
      habilitacion_con_desperdicio: [producto.habilitacion_con_desperdicio![0]],
    });
    expect(rows[1].total_con_desperdicio).toBeNull();
  });
});

test.describe("consumos: el resumen del backend", () => {
  // Registros con un ajuste y un material que SOLO aparece en un ajuste.
  const consumos = [
    { consumo_produccion_id: 22, detalles: [{ producto: 10575, producto_nombre: "GABARDINA", cantidad: "120.0000" }] },
    {
      consumo_produccion_id: 23,
      detalles: [
        { producto: 10575, producto_nombre: "GABARDINA", cantidad: "20.0000" },
        { producto: 999, producto_nombre: null, cantidad: "5.0000" },
      ],
    },
  ];
  const resumen: ProductionOrderConsumoResumen[] = [
    { producto: 10575, producto_nombre: "GABARDINA", unidad: "M", planeado: "120.0000", ajustes: "20.0000", actual: "140.0000" },
    { producto: 999, producto_nombre: null, unidad: null, planeado: "0.0000", ajustes: "5.0000", actual: "5.0000" },
  ];

  test("la tabla imprime consumos_resumen tal cual, con unidad y signo en ajustes", () => {
    const table = pdfTable<ProductionOrderConsumoResumen>(
      documentOf(op({ consumos, consumos_resumen: resumen })).elements,
      "CONSUMOS",
    );
    expect(cells(table)).toEqual([
      { Material: "GABARDINA", Unidad: "M", Planeado: "120", Ajustes: "+20", Actual: "140" },
      { Material: "Producto #999", Unidad: "—", Planeado: "0", Ajustes: "+5", Actual: "5" },
    ]);
  });

  test("no recalcula: si los registros dijeran otra cosa, manda el resumen", () => {
    const distinto: ProductionOrderConsumoResumen[] = [
      { producto: 10575, producto_nombre: "GABARDINA", unidad: "M", planeado: "1.0000", ajustes: "-0.5000", actual: "0.5000" },
    ];
    const table = pdfTable<ProductionOrderConsumoResumen>(
      documentOf(op({ consumos, consumos_resumen: distinto })).elements,
      "CONSUMOS",
    );
    expect(cells(table)).toEqual([
      { Material: "GABARDINA", Unidad: "M", Planeado: "1", Ajustes: "-0.5", Actual: "0.5" },
    ]);
  });

  test("el historial rotula Original al primer registro CON renglones, como el backend", () => {
    const labels = labelConsumptionRecords([
      consumos[1],
      { consumo_produccion_id: 5, detalles: [] },
      consumos[0],
    ]).map(({ record, isOriginal }) => [record.consumo_produccion_id, isOriginal]);
    expect(labels).toEqual([
      [5, false],
      [22, true],
      [23, false],
    ]);
  });
});

// ── Fuente: la descarga no toca la consulta de la página ─────────────────────

const notFound = () =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 404,
    statusText: "",
    headers: {},
    config: {} as AxiosResponse["config"],
    data: { msg: "Orden de producción no encontrada" },
  } as AxiosResponse);

async function download(respond: () => Promise<ProductionOrderOnboarding>) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const calls: { url: string; params: unknown }[] = [];
  v1_api.get = (async (url: string, config?: { params?: unknown }) => {
    calls.push({ url, params: config?.params });
    return { data: await respond() };
  }) as typeof v1_api.get;
  const client = new QueryClient();
  const pageKey = productionOrderOnboardingKey(72);
  const cached = op({ folio_op: "VIEJO" });
  client.setQueryData(pageKey, cached);
  const rendered: ProductionOrderOnboarding[] = [];
  const source = productionOrderPdfSource({
    opId: 72,
    render: async (detail) => {
      rendered.push(detail);
      return new Blob(["%PDF-fake"], { type: "application/pdf" });
    },
  });
  let outcome: { fileFolio: string | null | undefined; cancelled: boolean } | { error: unknown };
  try {
    const file = await source({ company: { name: "LAZZAR MEXICO", rfc: null } });
    outcome = { fileFolio: file.descriptor.folio, cancelled: file.descriptor.cancelled };
  } catch (error) {
    outcome = { error };
  } finally {
    v1_api.get = originalGet;
  }
  return { outcome, calls, rendered, state: client.getQueryState(pageKey), cachedNow: client.getQueryData(pageKey), cached };
}

test.describe("productionOrderPdfSource", () => {
  test("lee la OP fresca de onboarding/?op_id= y deja intacta la consulta de la página", async () => {
    const result = await download(async () => op({ estatus_op: 7 }));
    expect(result.outcome).toEqual({ fileFolio: "2026-OP-00045", cancelled: true });
    expect(result.calls).toEqual([{ url: "/produccion/orden-produccion/onboarding/", params: { op_id: 72 } }]);
    expect(result.cachedNow).toBe(result.cached);
  });

  test("un 404 no genera el PDF ni cambia la página a error", async () => {
    const result = await download(async () => {
      throw notFound();
    });
    expect("error" in result.outcome).toBe(true);
    expect(result.rendered).toHaveLength(0);
    expect(result.state?.status).toBe("success");
  });
});
