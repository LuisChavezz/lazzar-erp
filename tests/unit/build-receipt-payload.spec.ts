import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { buildReceiptPayload } from "@/src/features/receipts/utils/buildReceiptPayload";
import { isSalidaMaquilaRejection } from "@/src/features/receipts/utils/receiptErrors";
import { receiptFlowSubtitle } from "@/src/features/receipts/utils/receiptCandidates";
import type {
  ReceiptOnboardingProductionOrder,
  ReceiptOnboardingPurchaseOrder,
  ReceiptOnboardingSalidaMaquila,
} from "@/src/features/receipts/interfaces/receipt-onboarding.interface";
import type { ReceiptFormValues } from "@/src/features/receipts/schemas/receipt.schema";

/** EC-912: cuerpo del POST de recepción para OC, OP, SM de OP y SM de OB/OR. */

const FECHA = "2026-11-18T18:00:00.000Z";

const values = (cantidades: Record<string, string> = {}): ReceiptFormValues => ({
  almacen: 3,
  serie_codigo: "RC",
  remision: "R-55",
  factura_referencia: "",
  observaciones: "",
  cantidades,
});

const cabecera = {
  almacen: 3,
  serie_codigo: "RC",
  fecha_recepcion: FECHA,
  remision: "R-55",
  factura_referencia: "",
  observaciones: "",
  transportista: null,
};

const oc: ReceiptOnboardingPurchaseOrder = {
  id: 10,
  folio: "OC-1-10",
  tipo_compra: "MP",
  estatus: 2,
  proveedor_id: 1,
  proveedor_nombre: "Proveedor",
  sucursal_id: 1,
  almacen_id: null,
  fecha_oc: "2026-11-01",
  detalle: [
    {
      id: 100,
      producto_id: 1,
      producto_nombre: "Tela",
      cantidad_ordenada: "5",
      cantidad_recibida: "0",
      cantidad_pendiente: "5",
      descripcion: null,
      producto_variante_id: null,
      producto_variante_sku: null,
      producto_variante_color: null,
      producto_variante_talla: null,
    },
    {
      id: 101,
      producto_id: 2,
      producto_nombre: "Hilo",
      cantidad_ordenada: "5",
      cantidad_recibida: "0",
      cantidad_pendiente: "5",
      descripcion: null,
      producto_variante_id: null,
      producto_variante_sku: null,
      producto_variante_color: null,
      producto_variante_talla: null,
    },
  ],
};

const op: ReceiptOnboardingProductionOrder = {
  id: 82,
  folio: "2026-OP-00035",
  estatus: 1,
  pedido_id: null,
  sucursal_id: 1,
  fecha_inicio: "2026-11-01",
  cerrar_orden: false,
  detalle: [
    {
      id: 161,
      producto_id: 1,
      producto_nombre: "Chamarra",
      cantidad_ordenada: "2",
      cantidad_recibida: "0",
      cantidad_pendiente: "2",
      descripcion: null,
      producto_variante_id: 1111,
    },
  ],
};

const sm = (id: number, origen: "OP" | "OB" | "OR"): ReceiptOnboardingSalidaMaquila => ({
  id,
  folio: `SM-${id}`,
  folio_display: `SM-${id} · X`,
  origen,
  origen_folio: "X",
  op_id: origen === "OP" ? op.id : null,
  centro_confeccion: 8,
  centro_confeccion_nombre: "PRUEBA",
  sucursal_id: 1,
  fecha_envio: "2026-11-18",
  total_piezas: 2,
});

test("OC: orden_compra y solo los renglones con cantidad", () => {
  expect(buildReceiptPayload({ type: "compra", order: oc }, values({ "100": "3", "101": "0" }), FECHA)).toEqual({
    recepcion: { orden_compra: 10, ...cabecera },
    detalle: [{ orden_compra_detalle: 100, cantidad_recibida: "3" }],
  });
});

test("OP sin SM: orden_produccion, sin salida_maquila", () => {
  const payload = buildReceiptPayload(
    { type: "produccion", order: op, salidaMaquila: null },
    values({ "161": "1" }),
    FECHA,
  );
  expect(payload).toEqual({
    recepcion: { orden_produccion: 82, ...cabecera },
    detalle: [{ orden_produccion_detalle: 161, cantidad_recibida: "1", producto_variante: 1111 }],
  });
  expect("salida_maquila" in payload.recepcion).toBe(false);
});

test("SM de OP: orden_produccion + salida_maquila con los renglones de la OP", () => {
  expect(
    buildReceiptPayload({ type: "produccion", order: op, salidaMaquila: sm(26, "OP") }, values({ "161": "1" }), FECHA),
  ).toEqual({
    recepcion: { orden_produccion: 82, salida_maquila: 26, ...cabecera },
    detalle: [{ orden_produccion_detalle: 161, cantidad_recibida: "1", producto_variante: 1111 }],
  });
});

for (const origen of ["OB", "OR"] as const) {
  test(`SM de ${origen}: salida_maquila, detalle vacío y sin orden_produccion`, () => {
    const payload = buildReceiptPayload(
      { type: "salida-maquila", salidaMaquila: sm(25, origen) },
      values({ "161": "1" }),
      FECHA,
    );
    expect(payload).toEqual({ recepcion: { salida_maquila: 25, ...cabecera }, detalle: [] });
    expect("orden_produccion" in payload.recepcion).toBe(false);
    expect("orden_compra" in payload.recepcion).toBe(false);
  });
}

const axios400 = (data: unknown, status = 400) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

test("solo un 400 con la llave salida_maquila rechaza la SM", () => {
  expect(isSalidaMaquilaRejection(axios400({ salida_maquila: "La SM SM-00008 está cancelada." }))).toBe(true);
  expect(isSalidaMaquilaRejection(axios400({ almacen: "El almacén no pertenece a la sucursal de la SM." }))).toBe(false);
  expect(isSalidaMaquilaRejection(axios400({ salida_maquila: "x" }, 500))).toBe(false);
  expect(isSalidaMaquilaRejection(new Error("red"))).toBe(false);
});

test("subtítulo del diálogo según el flujo", () => {
  expect(receiptFlowSubtitle(null)).toBe("Selecciona la orden a recibir");
  expect(receiptFlowSubtitle({ type: "compra", order: oc })).toBe("Recepcionar Orden de Compra");
  expect(receiptFlowSubtitle({ type: "produccion", order: op, salidaMaquila: null })).toBe(
    "Recepcionar Orden de Producción",
  );
  expect(receiptFlowSubtitle({ type: "produccion", order: op, salidaMaquila: sm(26, "OP") })).toBe(
    "Recepcionar Salida a Maquila",
  );
  expect(receiptFlowSubtitle({ type: "salida-maquila", salidaMaquila: sm(25, "OB") })).toBe(
    "Recepcionar Salida a Maquila",
  );
});
