import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import {
  mesaPedidosTable,
  toPedidoKpisApiParams,
} from "@/src/features/orders/utils/pedidoListParams";
import {
  RETENIDO_FILTER_OPTIONS,
  SIN_SURTIR_FILTER_OPTIONS,
} from "@/src/features/orders/components/PedidoHeaderFilters";
import {
  PEDIDO_RETENCION_NOT_FOUND_MESSAGE,
  PEDIDO_RETENCION_PERMISO_MESSAGE,
  isPedidoRetenido,
  isStalePedidoRetencionError,
  pedidoRetencionAction,
  pedidoRetencionErrorMessage,
} from "@/src/features/orders/utils/pedidoRetencion";
import { patchDocumentosDespacho } from "@/src/features/orders/utils/pedidoDocumentos";
import type { PedidoDocumentos } from "@/src/features/orders/interfaces/pedido-documentos.interface";
import type { PedidoKpisMesa } from "@/src/features/orders/interfaces/pedido-list.interface";
import { buildMesaPedidoKpis } from "@/src/features/operations/utils/mesaPedidoKpis";
import { canCancelWmsDocuments } from "@/src/features/wms-cancellations/hooks/useCanCancelWmsDocuments";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";

/**
 * EC-946: controles de Mesa de Control del backend nucleo-erp#1352/#1369
 * (retener/liberar, filtros y KPIs de detenidos, cancelaciones de WMS por
 * Mesa de Control). Cuerpos de error tal como los responde el backend. Corren
 * con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const stateOf = (query: string) => {
  const params = new URLSearchParams(query);
  return readServerTableState(mesaPedidosTable, (key) => params.get(key));
};

test.describe("filtros de Mesa: retenido y sin_surtir", () => {
  test("`retenido` acepta sus dos valores y llega igual a la lista y a los KPIs", () => {
    for (const value of ["true", "false"]) {
      const criteria = toServerTableCriteria(mesaPedidosTable, stateOf(`retenido=${value}`));
      expect(criteria.retenido).toBe(value);
      expect(toPedidoKpisApiParams(criteria)).toEqual({ retenido: value });
    }
  });

  test("`sin_surtir` solo cuenta encendido; `false` u otro valor se tratan como ausentes", () => {
    expect(stateOf("sin_surtir=true").filters).toEqual({ sin_surtir: true });
    expect(stateOf("sin_surtir=false").filters).toEqual({});
    expect(stateOf("sin_surtir=1&retenido=si").filters).toEqual({});
  });

  test("se combinan con los demás filtros en los KPIs, sin `ordering`", () => {
    const criteria = toServerTableCriteria(
      mesaPedidosTable,
      stateOf("retenido=true&sin_surtir=true&confirmado=true&ordering=folio"),
    );
    expect(toPedidoKpisApiParams(criteria)).toEqual({
      confirmado: "true",
      retenido: "true",
      sin_surtir: "true",
    });
  });

  test("cada opción de los encabezados es un valor que su códec acepta", () => {
    for (const option of RETENIDO_FILTER_OPTIONS.filter((o) => o.value !== undefined)) {
      expect(stateOf(`retenido=${option.value}`).filters).toHaveProperty("retenido");
    }
    for (const option of SIN_SURTIR_FILTER_OPTIONS.filter((o) => o.value !== undefined)) {
      expect(stateOf(`sin_surtir=${option.value}`).filters).toHaveProperty("sin_surtir");
    }
  });
});

test.describe("acción de retención que se ofrece", () => {
  test("Retener si no está retenido; Liberar si lo está; ninguna si está cancelado", () => {
    expect(pedidoRetencionAction({ estatus: PEDIDO_ESTATUS.AUTORIZADA, retenido: false })).toBe("retener");
    expect(pedidoRetencionAction({ estatus: PEDIDO_ESTATUS.AUTORIZADA, retenido: true })).toBe("liberar");
    expect(pedidoRetencionAction({ estatus: PEDIDO_ESTATUS.CANCELADO, retenido: true })).toBeNull();
    expect(pedidoRetencionAction({ estatus: PEDIDO_ESTATUS.CANCELADO, retenido: false })).toBeNull();
  });

  test("una bandera ausente (backend anterior) cuenta como no retenido", () => {
    expect(isPedidoRetenido({})).toBe(false);
    expect(pedidoRetencionAction({ estatus: PEDIDO_ESTATUS.AUTORIZADA })).toBe("retener");
  });
});

test.describe("errores de retener/ y liberar/", () => {
  test("el 400 de `permiso` lleva el texto fijo de Mesa de Control", () => {
    const error = httpError(400, { permiso: "Acción disponible solo para mesa de control." });
    expect(pedidoRetencionErrorMessage(error, "retener")).toBe(PEDIDO_RETENCION_PERMISO_MESSAGE);
    expect(isStalePedidoRetencionError(error)).toBe(false);
  });

  test("el 400 `pedido` muestra el texto del backend y marca la fila como desactualizada", () => {
    const yaRetenido = httpError(400, { pedido: "El pedido ya está retenido." });
    expect(pedidoRetencionErrorMessage(yaRetenido, "retener")).toBe("El pedido ya está retenido.");
    expect(isStalePedidoRetencionError(yaRetenido)).toBe(true);
    const noRetenido = httpError(400, { pedido: "El pedido no está retenido." });
    expect(pedidoRetencionErrorMessage(noRetenido, "liberar")).toBe("El pedido no está retenido.");
  });

  test("el 404 (cancelado o fuera de alcance) avisa y relee", () => {
    const error = httpError(404, { detail: "No encontrado." });
    expect(pedidoRetencionErrorMessage(error, "liberar")).toBe(PEDIDO_RETENCION_NOT_FOUND_MESSAGE);
    expect(isStalePedidoRetencionError(error)).toBe(true);
  });

  test("el 400 `motivo` trae su texto; red y 5xx caen al genérico de la acción", () => {
    const motivo = httpError(400, { motivo: "Indica el motivo de la retención." });
    expect(pedidoRetencionErrorMessage(motivo, "retener")).toBe("Indica el motivo de la retención.");
    expect(isStalePedidoRetencionError(motivo)).toBe(false);
    expect(pedidoRetencionErrorMessage(httpError(500, {}), "retener")).toBe(
      "No se pudo retener el pedido. Intenta de nuevo.",
    );
    expect(pedidoRetencionErrorMessage(new Error("Network Error"), "liberar")).toBe(
      "No se pudo liberar el pedido. Intenta de nuevo.",
    );
  });
});

test.describe("KPIs de Mesa de Control", () => {
  const kpis: PedidoKpisMesa = {
    total: 40,
    confirmados: 30,
    por_confirmar: 10,
    cancelados: 2,
    retenidos: 4,
    sin_surtir: 12,
    por_moneda: [],
    puede_ver_importes: false,
  };

  test("seis tarjetas: el embudo de confirmación y, debajo, lo detenido y el valor", () => {
    expect(buildMesaPedidoKpis(kpis).map((card) => card.label)).toEqual([
      "Total pedidos",
      "Por confirmar",
      "Confirmados",
      "Retenidos",
      "Sin surtir",
      "Valor total",
    ]);
  });

  test("retenidos y sin surtir con su conteo y su porcentaje del total", () => {
    const cards = buildMesaPedidoKpis(kpis);
    const retenidos = cards.find((card) => card.label === "Retenidos");
    const sinSurtir = cards.find((card) => card.label === "Sin surtir");
    expect(retenidos).toMatchObject({ value: "4", progress: 10 });
    expect(sinSurtir).toMatchObject({ value: "12", progress: 30 });
  });

  test("con total en cero los porcentajes quedan en 0", () => {
    const cards = buildMesaPedidoKpis({ ...kpis, total: 0, confirmados: 0, por_confirmar: 0 });
    expect(cards.find((card) => card.label === "Sin surtir")?.progress).toBe(0);
  });
});

test.describe("permiso de las cancelaciones de WMS", () => {
  test("con `WMS-CANCELAR` o con el rol admin", () => {
    expect(canCancelWmsDocuments({ permissions: ["WMS-CANCELAR"] })).toBe(true);
    expect(canCancelWmsDocuments({ role: "admin", permissions: [] })).toBe(true);
  });

  test("Mesa de Control (`es_mesa_control: true`) sin el código", () => {
    expect(canCancelWmsDocuments({ permissions: [], es_mesa_control: true })).toBe(true);
  });

  test("un `false` explícito no quita un `WMS-CANCELAR` concedido", () => {
    expect(canCancelWmsDocuments({ permissions: ["WMS-CANCELAR"], es_mesa_control: false })).toBe(true);
  });

  test("sin código ni bandera (o sesión anterior a EC-943), no; sin sesión, no", () => {
    expect(canCancelWmsDocuments({ permissions: ["R-WMS"], es_mesa_control: false })).toBe(false);
    expect(canCancelWmsDocuments({ permissions: ["E-MESACONTROL-PEDIDOS"] })).toBe(false);
    expect(canCancelWmsDocuments(null)).toBe(false);
  });
});

test.describe("cancelar un despacho desde Documentos", () => {
  const docs = (): PedidoDocumentos => ({
    cotizaciones: [],
    ordenes_compra: [],
    pre_ordenes: [],
    ordenes_produccion: [],
    ordenes_bordado: [],
    ordenes_reflejante: [],
    ordenes_corte_manga: [],
    salidas_maquila: [],
    pickings: [],
    packings: [],
    despachos: [
      { id: 54, guia: "", envio_id: 3, packing_id: 9, packing_folio: "PACK-9", estado: "ACTIVO", motivo_cancelacion: "" },
      { id: 55, guia: "G1", envio_id: 3, packing_id: 10, packing_folio: "PACK-10", estado: "ACTIVO", motivo_cancelacion: "" },
    ],
    envios: [],
    movimientos_inventario: [],
    facturas: [],
    cobros: [],
  });

  test("escribe estado y motivo solo en la fila de ese despacho", () => {
    const before = docs();
    const after = patchDocumentosDespacho(before, {
      id: 54,
      estado: "CANCELADO",
      motivo_cancelacion: "GUÍA EQUIVOCADA",
    });
    expect(after?.despachos[0]).toMatchObject({ id: 54, estado: "CANCELADO", motivo_cancelacion: "GUÍA EQUIVOCADA" });
    expect(after?.despachos[1]).toBe(before.despachos[1]);
    expect(before.despachos[0].estado).toBe("ACTIVO");
  });

  test("sin esa fila, sin `estado` o sin documentos en caché no cambia nada", () => {
    const before = docs();
    expect(patchDocumentosDespacho(before, { id: 99, estado: "CANCELADO" })).toBe(before);
    expect(patchDocumentosDespacho(before, { id: 54 })).toBe(before);
    expect(patchDocumentosDespacho(undefined, { id: 54, estado: "CANCELADO" })).toBeUndefined();
    expect(patchDocumentosDespacho(before, null)).toBe(before);
  });
});
