import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CancellationInfo } from "@/src/components/CancellationInfo";
import {
  cancelDialogClosesOnError,
  cancelErrorTarget,
  classifyCancelError,
} from "@/src/features/document-cancellation/utils/cancelErrors";
import { cancellationPdfFields } from "@/src/features/document-cancellation/utils/cancellationPdf";
import { CancelReasonFormSchema } from "@/src/features/document-cancellation/schemas/cancel-reason.schema";
import { embroideryStatusEntry } from "@/src/features/embroidery/constants/embroideryStatus";
import {
  getAvailableTransitions,
  isEmbroideryOrderCancellable,
} from "@/src/features/embroidery/constants/embroideryStatusTransitions";
import { salidaMaquilaCancelAction } from "@/src/features/maquila-outputs/utils/salidaMaquilaCancelAction";
import type { SalidaMaquilaListItem } from "@/src/features/maquila-outputs/interfaces/salida-maquila.interface";
import {
  classifyChangeStatusError,
  staleDataAfterStatusError,
} from "@/src/features/production-order-status/hooks/productionOrderStatusErrors";
import {
  productionOrderStatusValues,
  writeProductionOrderStatus,
} from "@/src/features/production-order-status/utils/productionOrderStatusCache";
import { mergeCachedRecord, patchRowById } from "@/src/utils/cachedRows";
import { productionOrderPdfDescriptor } from "@/src/features/production-orders/utils/productionOrderPdf";
import {
  canCancelPreOrder,
  preOrderNextStep,
  PRE_ORDER_NEXT_STEP,
} from "@/src/features/pre-orders/constants/preOrderStatus";
import { preOrderEventUserName } from "@/src/features/pre-orders/utils/preOrderHistory";
import {
  toCancelAction,
  type WmsCancelAction,
} from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import {
  workOrderCancelAction,
  workOrderCancelledValues,
  type WorkOrderCancelConfig,
} from "@/src/features/work-order-cancellation/utils/workOrderCancelAction";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { hasProductionPermission } from "@/src/utils/productionPermissions";
import { toReactElement } from "./support/pwJsx";
import { getWorkOrderTransitions, isWorkOrderCancellable } from "@/src/utils/workOrderStatusEdit";

/**
 * EC-948: cancelaciones de Producción con motivo (nucleo-erp#1355, EC-966,
 * EC-968). Funciones puras y escrituras en una `QueryClient` real; los `run`
 * (los POST) no se llaman.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", String(status), config, undefined, response);
};

const MESSAGES = { fallback: "respaldo", notFound: "no está", forbidden: "sin permiso" };

test.describe("cancelación genérica con motivo", () => {
  test("clasifica motivo, llaves de bloqueo, lista plana, 404, 403 y el resto", () => {
    const keys = { blockingKeys: ["salidas_maquila"], messages: MESSAGES };
    expect(classifyCancelError(httpError(400, { motivo: "Indica el motivo de la cancelación." }), keys)).toEqual({
      kind: "motivo",
      message: "Indica el motivo de la cancelación.",
    });
    expect(
      classifyCancelError(httpError(400, { salidas_maquila: "La orden tiene la salida a maquila SM-00007 enviada: cancélala primero." }), keys),
    ).toEqual({ kind: "blocked", message: "La orden tiene la salida a maquila SM-00007 enviada: cancélala primero." });
    expect(classifyCancelError(httpError(400, { salidas_maquila: ["Cambió. Intenta de nuevo."] }), keys).kind).toBe("retryable");
    expect(classifyCancelError(httpError(400, ["Inventario insuficiente"]), keys)).toEqual({
      kind: "blocked",
      message: "Inventario insuficiente",
    });
    expect(classifyCancelError(httpError(404, { detail: "No encontrado." }), keys)).toEqual({ kind: "not-found", message: "no está" });
    expect(classifyCancelError(httpError(403, { detail: "No tienes permiso para cancelar (D-PRODUCCION-OB)." }), keys)).toEqual({
      kind: "forbidden",
      message: "No tienes permiso para cancelar (D-PRODUCCION-OB).",
    });
    expect(classifyCancelError(httpError(500, "<html>"), keys)).toEqual({ kind: "other", message: "respaldo" });
    // Una llave que la acción no declara no bloquea.
    expect(classifyCancelError(httpError(400, { recepciones: "otra" }), keys).kind).toBe("other");
  });

  test("el 400 de negocio va al diálogo solo si se pidió; el motivo, bajo el campo", () => {
    const blocked = { kind: "blocked", message: "x" } as const;
    const handlers = { hasMotivoHandler: true, hasBlockedHandler: true };
    expect(cancelErrorTarget(blocked, handlers)).toBe("dialog");
    expect(cancelErrorTarget({ kind: "retryable", message: "x" }, handlers)).toBe("dialog");
    expect(cancelErrorTarget(blocked, { ...handlers, hasBlockedHandler: false })).toBe("toast");
    expect(cancelErrorTarget({ kind: "motivo", message: "x" }, handlers)).toBe("motivo");
    expect(cancelErrorTarget({ kind: "motivo", message: "x" }, { ...handlers, hasMotivoHandler: false })).toBe("toast");
    expect(cancelErrorTarget({ kind: "forbidden", message: "x" }, handlers)).toBe("toast");
  });

  test("con keepOpenOnBlocked solo el 404 cierra; sin él, también el bloqueo (WMS)", () => {
    expect(cancelDialogClosesOnError({ kind: "blocked", message: "x" }, true)).toBe(false);
    expect(cancelDialogClosesOnError({ kind: "not-found", message: "x" }, true)).toBe(true);
    expect(cancelDialogClosesOnError({ kind: "blocked", message: "x" }, false)).toBe(true);
    expect(cancelDialogClosesOnError({ kind: "retryable", message: "x" }, false)).toBe(false);
    expect(cancelDialogClosesOnError({ kind: "other", message: "x" }, false)).toBe(false);
  });

  test("el motivo es obligatorio, recortado y de a lo más 500 caracteres", () => {
    expect(CancelReasonFormSchema.safeParse({ motivo: "   " }).success).toBe(false);
    expect(CancelReasonFormSchema.parse({ motivo: "  Cliente quitó el bordado " }).motivo).toBe("Cliente quitó el bordado");
    expect(CancelReasonFormSchema.safeParse({ motivo: "a".repeat(500) }).success).toBe(true);
    expect(CancelReasonFormSchema.safeParse({ motivo: "a".repeat(501) }).success).toBe(false);
  });

  test("el adaptador de WMS relee lo de WMS y luego su refresh, y clasifica con sus llaves", async () => {
    const queryClient = new QueryClient();
    const invalidated: unknown[] = [];
    const original = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((filters?: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return original(filters as never);
    }) as typeof queryClient.invalidateQueries;
    const calls: string[] = [];
    const wms: WmsCancelAction<{ id: number }> = {
      mutationKey: ["cancelar-picking", 1],
      run: async () => ({ id: 1 }),
      applyResult: () => undefined,
      refresh: () => calls.push("propio"),
      blockingKeys: ["existencia"],
      successMessage: () => "ok",
      fallbackErrorMessage: "falló",
    };
    const action = toCancelAction(wms);
    expect(action.mutationKey).toEqual(["cancelar-picking", 1]);
    action.refresh(queryClient);
    expect(invalidated).toContainEqual(["shipments"]);
    expect(invalidated).toContainEqual(["transferencias"]);
    expect(calls).toEqual(["propio"]);
    expect(action.classifyError(httpError(400, { picking: "Cancela primero el packing." })).kind).toBe("blocked");
    expect(action.classifyError(httpError(400, { existencia: "Sin stock." })).kind).toBe("blocked");
    expect(action.classifyError(httpError(404, {})).message).toBe(
      "El documento ya no está disponible o no tienes acceso a él.",
    );
  });
});

const smEnviada = (overrides: Partial<SalidaMaquilaListItem> = {}): SalidaMaquilaListItem => ({
  id: 12,
  folio: "SM-00012",
  folio_display: "SM-00012 · OB-00003",
  estatus: "ENVIADA",
  estatus_display: "Enviada",
  origen: "OB",
  origen_id: 3,
  op: null,
  op_folio: null,
  ob: 3,
  ob_folio: "OB-00003",
  orden_r: null,
  orden_r_folio: null,
  centro_confeccion: 9,
  centro_confeccion_nombre: "Maquila Norte",
  sucursal: 1,
  fecha_envio: "2026-11-20",
  fecha_compromiso: null,
  fecha_recepcion: null,
  total_piezas: "10",
  observaciones: null,
  usuario: 4,
  created_at: "2026-11-20T10:00:00Z",
  ...overrides,
});

test.describe("cancelar una SM", () => {
  test("escribe el estatus y la cancelación en el listado y el detalle, sin tocar importes", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["salidas-maquila", {}], [smEnviada({ total: "100.00" }), smEnviada({ id: 13, folio: "SM-00013" })]);
    queryClient.setQueryData(["salidas-maquila", "detail", 12], { ...smEnviada({ total: "100.00" }), detalles: [] });
    const action = salidaMaquilaCancelAction(smEnviada());
    await action.applyResult(queryClient, {
      ...smEnviada({ total: "999.00" }),
      estatus: "CANCELADA",
      estatus_display: "Cancelada",
      motivo_cancelacion: "El maquilero no la recibió",
      fecha_cancelacion: "2026-11-25T03:30:00Z",
      cancelado_por: 4,
      cancelado_por_nombre: "Ana López",
      detalles: [],
    });
    const rows = queryClient.getQueryData<SalidaMaquilaListItem[]>(["salidas-maquila", {}])!;
    expect(rows[0]).toMatchObject({ estatus: "CANCELADA", cancelado_por_nombre: "Ana López", total: "100.00" });
    expect(rows[1].estatus).toBe("ENVIADA");
    expect(queryClient.getQueryData(["salidas-maquila", "detail", 12])).toMatchObject({
      estatus: "CANCELADA",
      motivo_cancelacion: "El maquilero no la recibió",
      total: "100.00",
    });
  });

  test("su 400 estatus bloquea y su refresh relee su orden de origen", () => {
    const queryClient = new QueryClient();
    const invalidated: unknown[] = [];
    queryClient.invalidateQueries = ((filters?: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return Promise.resolve();
    }) as typeof queryClient.invalidateQueries;
    const action = salidaMaquilaCancelAction(smEnviada());
    action.refresh(queryClient);
    expect(invalidated).toContainEqual(["salidas-maquila"]);
    expect(invalidated).toContainEqual(["embroidery-order-detail", 3]);
    const blocked = action.classifyError(
      httpError(400, { estatus: ["La SM ya tiene recepciones; cierra el faltante desde la recepción."] }),
    );
    expect(blocked).toEqual({ kind: "blocked", message: "La SM ya tiene recepciones; cierra el faltante desde la recepción." });
    expect(action.classifyError(httpError(400, { motivo: "Indica el motivo de la cancelación." })).kind).toBe("motivo");
  });
});

const obConfig = (overrides: Partial<WorkOrderCancelConfig> = {}): WorkOrderCancelConfig => ({
  orderId: 3,
  folio: "OB-00003",
  orderLabel: "orden de bordado",
  statusField: "estatus_bordado",
  cancelledLabel: "Cancelado",
  cancel: async () => ({ id: 3, folio: "OB-00003", estatus: 8 }),
  detailQueryKey: ["embroidery-order-detail", 3],
  detailPrefixQueryKey: ["embroidery-order-detail"],
  onboardingQueryKey: ["embroidery-onboarding"],
  listQueryKey: ["embroidery-orders"],
  hasSalidasMaquila: true,
  ...overrides,
});

test.describe("cancelar OB, OR y OCM", () => {
  test("solo se ofrece en los estatus que acepta cancelar/", () => {
    for (const estatus of [1, 2, 3, 4, 5, 6] as const) {
      expect(isEmbroideryOrderCancellable({ estatus_bordado: estatus, activo: true })).toBe(true);
    }
    expect(isEmbroideryOrderCancellable({ estatus_bordado: 7 })).toBe(false); // Finalizado
    expect(isEmbroideryOrderCancellable({ estatus_bordado: 8 })).toBe(false); // Cancelado
    expect(isEmbroideryOrderCancellable({ estatus_bordado: 2, activo: false })).toBe(false); // dada de baja
    expect(isWorkOrderCancellable(1)).toBe(true);
    expect(isWorkOrderCancellable(6, true)).toBe(true);
    expect(isWorkOrderCancellable(5)).toBe(false); // Completado
    expect(isWorkOrderCancellable(7)).toBe(false); // Cancelado
    expect(isWorkOrderCancellable(2, false)).toBe(false);
  });

  test("Cancelado sigue fuera de los selectores de estatus, y el 8 de bordado se rotula «Cancelado»", () => {
    expect(getAvailableTransitions(2)).not.toContain(8);
    expect(getWorkOrderTransitions(2)).not.toContain(7);
    expect(embroideryStatusEntry(8).label).toBe("Cancelado");
  });

  test("se ofrece con el código D- de su sección", () => {
    const conOb = { role: "user", permissions: ["D-PRODUCCION-OB"] };
    expect(hasProductionPermission(conOb, "OB", "D")).toBe(true);
    expect(hasProductionPermission(conOb, "OR", "D")).toBe(false);
    expect(hasProductionPermission({ role: "user", permissions: ["E-PRODUCCION-CM"] }, "CM", "D")).toBe(false);
    expect(hasProductionPermission({ role: "admin", permissions: [] }, "CM", "D")).toBe(true);
  });

  test("la respuesta escribe el estatus en su propio campo, con su etiqueta, y solo para esa orden", () => {
    const response = {
      id: 3,
      folio: "OB-00003",
      estatus: 8,
      motivo_cancelacion: "Cliente quitó el bordado",
      fecha_cancelacion: "2026-11-25T18:00:00Z",
      cancelado_por: 4,
      cancelado_por_nombre: "Ana López",
    };
    expect(workOrderCancelledValues(obConfig(), response)).toEqual({
      estatus_bordado: 8,
      estatus_bordado_display: "Cancelado",
      motivo_cancelacion: "Cliente quitó el bordado",
      fecha_cancelacion: "2026-11-25T18:00:00Z",
      cancelado_por: 4,
      cancelado_por_nombre: "Ana López",
    });
    expect(workOrderCancelledValues(obConfig(), { ...response, id: 99 })).toEqual({});
    expect(workOrderCancelledValues(obConfig(), { id: 3 })).toEqual({});
  });

  test("escribe la fila y el detalle en caché", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["embroidery-orders"], [
      { id: 3, estatus_bordado: 2, estatus_bordado_display: "Programado" },
      { id: 4, estatus_bordado: 2, estatus_bordado_display: "Programado" },
    ]);
    queryClient.setQueryData(["embroidery-order-detail", 3], { id: 3, estatus_bordado: 2, detalles: [] });
    const action = workOrderCancelAction(obConfig());
    await action.applyResult(queryClient, { id: 3, folio: "OB-00003", estatus: 8, cancelado_por_nombre: "Ana López" });
    expect(queryClient.getQueryData(["embroidery-orders"])).toEqual([
      { id: 3, estatus_bordado: 8, estatus_bordado_display: "Cancelado", cancelado_por_nombre: "Ana López" },
      { id: 4, estatus_bordado: 2, estatus_bordado_display: "Programado" },
    ]);
    expect(queryClient.getQueryData(["embroidery-order-detail", 3])).toMatchObject({ estatus_bordado: 8, detalles: [] });
  });

  test("el campo de estatus y la SM Enviada bloquean; la OCM no tiene SM", () => {
    const ob = workOrderCancelAction(obConfig());
    expect(ob.classifyError(httpError(400, { estatus_bordado: "La orden ya está terminada; no se cancela." }))).toEqual({
      kind: "blocked",
      message: "La orden ya está terminada; no se cancela.",
    });
    expect(
      ob.classifyError(httpError(400, { salidas_maquila: "La orden tiene la salida a maquila SM-00012 enviada: cancélala primero." })),
    ).toEqual({ kind: "blocked", message: "La orden tiene la salida a maquila SM-00012 enviada: cancélala primero." });
    expect(ob.classifyError(httpError(404, {})).message).toBe("La orden de bordado ya no existe o no tienes acceso a ella.");
    const ocm = workOrderCancelAction(
      obConfig({ statusField: "estatus_corte", orderLabel: "orden de corte de manga", hasSalidasMaquila: false }),
    );
    expect(ocm.classifyError(httpError(400, { estatus_corte: "La orden está dada de baja." })).kind).toBe("blocked");
    expect(ocm.classifyError(httpError(400, { salidas_maquila: "x" })).kind).toBe("other");
  });

  test("al cancelar se releen los detalles de la sección (hermanas), su onboarding, el listado, la bitácora, el pedido y (OB/OR) las SM", () => {
    const queryClient = new QueryClient();
    const invalidated: unknown[] = [];
    queryClient.invalidateQueries = ((filters?: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return Promise.resolve();
    }) as typeof queryClient.invalidateQueries;
    workOrderCancelAction(obConfig()).refresh(queryClient);
    expect(invalidated).toEqual(
      expect.arrayContaining([["embroidery-order-detail"], ["embroidery-onboarding"], ["embroidery-orders"], ["salidas-maquila"]]),
    );
    invalidated.length = 0;
    workOrderCancelAction(obConfig({ hasSalidasMaquila: false })).refresh(queryClient);
    expect(invalidated).not.toContainEqual(["salidas-maquila"]);
  });
});

test.describe("cancelar una OP", () => {
  test("el 400 que la bloquea se muestra tal cual y relee estatus y detalle", () => {
    const recepcion = httpError(400, {
      recepciones: "La OP tiene la recepción RT-00004 de producto terminado: cancélala primero en WMS.",
    });
    expect(classifyChangeStatusError(recepcion)).toEqual({
      kind: "message",
      message: "La OP tiene la recepción RT-00004 de producto terminado: cancélala primero en WMS.",
    });
    expect(staleDataAfterStatusError(recepcion)).toBe("status-and-detail");
    const sm = httpError(400, { salidas_maquila: "La OP tiene la salida a maquila SM-00007 enviada: cancélala primero." });
    expect(classifyChangeStatusError(sm).message).toContain("SM-00007");
    expect(staleDataAfterStatusError(sm)).toBe("status-and-detail");
    // El motivo sigue bajo su campo, y un 400 cualquiera no relee nada.
    expect(classifyChangeStatusError(httpError(400, { motivo: "El motivo es obligatorio para pasar a Cancelado." })).kind).toBe(
      "motivo",
    );
    expect(staleDataAfterStatusError(httpError(400, { permiso: "Acción disponible solo para producción." }))).toBeNull();
  });

  test("el resultado se escribe por op_id en el listado, el retrieve y el detalle", async () => {
    const response = {
      msg: "Estatus actualizado",
      op_id: 38,
      estatus_op: 7,
      estatus_op_display: "Cancelado",
      fecha_fin: null,
      motivo_cancelacion: "Se canceló el pedido",
      fecha_cancelacion: "2026-11-25T18:00:00Z",
      cancelado_por: 4,
      cancelado_por_nombre: "Ana López",
    };
    expect(productionOrderStatusValues(38, response)).toMatchObject({ estatus_op: 7, cancelado_por_nombre: "Ana López" });
    expect(productionOrderStatusValues(39, response)).toEqual({});
    const rows = [{ op_id: 38, estatus_op: 2 }, { op_id: 40, estatus_op: 2 }];

    const queryClient = new QueryClient();
    queryClient.setQueryData(["production-orders"], rows);
    queryClient.setQueryData(["production-orders", "retrieve", 38], { op_id: 38, estatus_op: 2 });
    queryClient.setQueryData(["production-order-onboarding", 38], { op_id: 38, estatus_op: 2, productos: [] });
    await writeProductionOrderStatus(queryClient, 38, response);
    expect(queryClient.getQueryData<typeof rows>(["production-orders"])![0].estatus_op).toBe(7);
    expect(queryClient.getQueryData(["production-orders", "retrieve", 38])).toMatchObject({ estatus_op: 7 });
    expect(queryClient.getQueryData(["production-order-onboarding", 38])).toMatchObject({
      estatus_op: 7,
      motivo_cancelacion: "Se canceló el pedido",
      productos: [],
    });
  });
});

test.describe("datos de la cancelación", () => {
  test("CancellationInfo muestra el motivo, quién y la fecha en la zona de México", () => {
    const fecha = "2026-11-25T03:30:00Z"; // 24 nov, 21:30 en México
    const html = renderToString(
      toReactElement(
        createElement(CancellationInfo, {
          title: "Orden cancelada",
          motivo: "Cliente quitó el bordado",
          fecha,
          canceladoPor: "Ana López",
        }),
      ),
    );
    expect(html).toContain("Orden cancelada");
    expect(html).toContain("Cliente quitó el bordado");
    expect(html).toContain("Ana López");
    expect(html).toContain(formatShortDateTime(fecha));
    expect(formatShortDateTime(fecha)).toContain("24");
    // Una OP cancelada antes de nucleo-erp#1355: sin motivo ni quién.
    const legacy = renderToString(
      toReactElement(createElement(CancellationInfo, { title: "Orden cancelada", motivo: "", fecha: null })),
    );
    expect(legacy).toContain("Sin motivo registrado.");
  });

  test("el PDF de una OP cancelada lleva motivo, quién y cuándo; sin cancelar, nada", () => {
    const cancelled = productionOrderPdfDescriptor({
      op_id: 38,
      folio_op: "2026-OP-00038",
      estatus_op: 7,
      motivo_cancelacion: " Se canceló el pedido ",
      fecha_cancelacion: "2026-11-25T03:30:00Z",
      cancelado_por_nombre: "Ana López",
    });
    expect(cancelled.cancellationReason).toBe("Se canceló el pedido");
    expect(cancelled.cancellationDetail).toBe(`Canceló: Ana López · Fecha: ${formatShortDateTime("2026-11-25T03:30:00Z")}`);
    const open = productionOrderPdfDescriptor({ op_id: 38, folio_op: "2026-OP-00038", estatus_op: 2, motivo_cancelacion: "x" });
    expect(open).not.toHaveProperty("cancellationReason");
    expect(open).not.toHaveProperty("cancellationDetail");
    // Cancelada sin datos (antes de #1355): solo la marca.
    expect(cancellationPdfFields(true, { motivo_cancelacion: "", fecha_cancelacion: null })).toEqual({});
  });
});

test.describe("pre-orden de una OP cancelada", () => {
  test("Cancelar pre-orden: abierta, o Convertida con su OP cancelada (op_estatus 7)", () => {
    expect(canCancelPreOrder("pendiente_validar")).toBe(true);
    expect(canCancelPreOrder("convertida")).toBe(false);
    expect(canCancelPreOrder("convertida", 3)).toBe(false);
    expect(canCancelPreOrder("convertida", 7)).toBe(true);
    expect(canCancelPreOrder("cancelada", 7)).toBe(false);
    expect(canCancelPreOrder("rechazada", 7)).toBe(false);
    expect(preOrderNextStep("convertida", 7)).toContain("La OP se canceló");
    expect(preOrderNextStep("convertida", 2)).toBe(PRE_ORDER_NEXT_STEP.convertida);
  });

  test("el historial lee el nombre de usuario.nombre", () => {
    expect(preOrderEventUserName({ usuario: { id: 4, nombre: "Ana López" } })).toBe("Ana López");
    expect(preOrderEventUserName({ usuario: { id: 4, nombre: "  " } })).toBeNull();
    expect(preOrderEventUserName({ usuario: null })).toBeNull();
    expect(preOrderEventUserName({ usuario: 4 })).toBeNull();
    expect(preOrderEventUserName({ usuario: "ana@acme.test" })).toBe("ana@acme.test");
    expect(preOrderEventUserName({ usuario: { id: 4, nombre: "Ana" }, usuario_nombre: "Ana López" })).toBe("Ana López");
  });
});

test.describe("cachedRows con idField", () => {
  const patch = (row: Record<string, unknown>) => ({ ...row, estatus: 7 });

  test("por omisión sigue buscando por id; con idField, por ese campo", () => {
    const byId = [{ id: 1, estatus: 2 }, { id: 2, estatus: 2 }];
    expect(patchRowById(byId, 1, patch)).toEqual([{ id: 1, estatus: 7 }, { id: 2, estatus: 2 }]);
    const byOpId = [{ op_id: 1, estatus: 2 }];
    // Sin idField, una fila sin `id` no se toca (misma referencia).
    expect(patchRowById(byOpId, 1, patch)).toBe(byOpId);
    expect(patchRowById(byOpId, 1, patch, { idField: "op_id" })).toEqual([{ op_id: 1, estatus: 7 }]);
    const page = { count: 1, results: [{ op_id: 1, estatus: 2 }] };
    expect(patchRowById(page, 1, patch, { idField: "op_id" })).toEqual({ count: 1, results: [{ op_id: 1, estatus: 7 }] });
  });

  test("mergeCachedRecord compara el registro por idField", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["op", 1], { op_id: 1, estatus_op: 2 });
    await mergeCachedRecord(queryClient, ["op", 1], 1, { estatus_op: 7 });
    expect(queryClient.getQueryData(["op", 1])).toEqual({ op_id: 1, estatus_op: 2 });
    await mergeCachedRecord(queryClient, ["op", 1], 1, { estatus_op: 7 }, { idField: "op_id" });
    expect(queryClient.getQueryData(["op", 1])).toEqual({ op_id: 1, estatus_op: 7 });
  });
});
