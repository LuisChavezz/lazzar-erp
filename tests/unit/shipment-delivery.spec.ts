import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import {
  canDeliverShipment,
  isShipmentDelivered,
  shipmentDisplayStatus,
} from "@/src/features/shipping/utils/shipmentDelivery";
import { SHIPPING_EXPORT_COLUMNS } from "@/src/features/shipping/utils/shippingExport";
import {
  deliverShipmentMutationKey,
  isDeliverDespachoRejection,
  parseDeliverShipmentError,
} from "@/src/features/shipping/hooks/useDeliverShipment";
import {
  DeliverShipmentFormSchema,
  FECHA_ENTREGA_FUTURA_MESSAGE,
  buildDeliverShipmentPayload,
  toFechaEntrega,
} from "@/src/features/shipping/schemas/shipment-delivery.schema";
import { patchDocumentosDespacho } from "@/src/features/orders/utils/pedidoDocumentos";
import { writeDespachoToPedidoDocumentos } from "@/src/features/orders/utils/orderDespachoCancel";
import { pedidoDocumentosQueryKey } from "@/src/features/orders/hooks/usePedidoDocumentos";
import type { PedidoDocumentos } from "@/src/features/orders/interfaces/pedido-documentos.interface";
import type { Shipment } from "@/src/features/shipping/interfaces/shipping.interface";
import type { DeliverShipmentFormField } from "@/src/features/shipping/schemas/shipment-delivery.schema";

/**
 * EC-955: entrega del despacho (nucleo-erp #1361 y #1432). Entregar no cambia
 * `estado`: "entregado" es `fecha_entrega` no nula, y desde ahí no se cancela.
 */

const ENTREGA = "2026-11-26T10:30:00-06:00";

const axiosError = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const collectFieldErrors = () => {
  const errors: Partial<Record<DeliverShipmentFormField, string>> = {};
  return { errors, set: (field: DeliverShipmentFormField, message: string) => (errors[field] = message) };
};

test("entregado sale de `fecha_entrega`, no de `estado`", () => {
  expect(isShipmentDelivered({ fecha_entrega: ENTREGA })).toBe(true);
  expect(isShipmentDelivered({ fecha_entrega: null })).toBe(false);
  // Un backend anterior que no manda el campo: no entregado.
  expect(isShipmentDelivered({})).toBe(false);

  expect(shipmentDisplayStatus({ estado: "ACTIVO", fecha_entrega: ENTREGA })).toBe("ENTREGADO");
  expect(shipmentDisplayStatus({ estado: "ACTIVO", fecha_entrega: null })).toBe("ACTIVO");
  expect(shipmentDisplayStatus({ estado: "CANCELADO", fecha_entrega: null })).toBe("CANCELADO");
});

test("Entregar solo en un activo sin entrega", () => {
  expect(canDeliverShipment({ estado: "ACTIVO", fecha_entrega: null })).toBe(true);
  expect(canDeliverShipment({ estado: "ACTIVO", fecha_entrega: ENTREGA })).toBe(false);
  expect(canDeliverShipment({ estado: "CANCELADO", fecha_entrega: null })).toBe(false);
});

test("la exportación dice Entregado, como la tabla", () => {
  const estado = SHIPPING_EXPORT_COLUMNS.find((column) => column.header === "Estado");
  const row = (estado_: Shipment["estado"], fecha_entrega: string | null) =>
    ({ estado: estado_, fecha_entrega, despacho_detalle: [] }) as unknown as Shipment;
  expect(estado?.text(row("ACTIVO", ENTREGA))).toBe("Entregado");
  expect(estado?.text(row("ACTIVO", null))).toBe("Activo");
  expect(estado?.text(row("CANCELADO", null))).toBe("Cancelado");
});

test("fecha_entrega: ISO con el offset de México y nunca futura", () => {
  const now = new Date("2026-11-26T18:00:00Z"); // 12:00 en México
  expect(toFechaEntrega("2026-11-26", "11:59", now)).toEqual({ iso: "2026-11-26T11:59:00-06:00" });
  expect(toFechaEntrega("2026-11-26", "12:00", now)).toEqual({ iso: "2026-11-26T12:00:00-06:00" });
  expect(toFechaEntrega("2026-11-26", "12:01", now)).toEqual({ field: "hora", message: FECHA_ENTREGA_FUTURA_MESSAGE });
  expect(toFechaEntrega("2026-11-27", "08:00", now)).toEqual({ field: "hora", message: FECHA_ENTREGA_FUTURA_MESSAGE });
  // Horario de verano (antes de 2022): offset -05:00.
  expect(toFechaEntrega("2021-07-01", "09:00", now)).toEqual({ iso: "2021-07-01T09:00:00-05:00" });
});

test("recibio: opcional, recortado y de a lo más 150 caracteres", () => {
  const base = { fecha: "2026-11-26", hora: "10:00" };
  expect(DeliverShipmentFormSchema.parse({ ...base, recibio: "  Juan Pérez  " }).recibio).toBe("Juan Pérez");
  expect(DeliverShipmentFormSchema.safeParse({ ...base, recibio: "" }).success).toBe(true);
  expect(DeliverShipmentFormSchema.safeParse({ ...base, recibio: "a".repeat(150) }).success).toBe(true);
  expect(DeliverShipmentFormSchema.safeParse({ ...base, recibio: "a".repeat(151) }).success).toBe(false);
  expect(DeliverShipmentFormSchema.safeParse({ ...base, recibio: "", fecha: "" }).success).toBe(false);
  expect(DeliverShipmentFormSchema.safeParse({ ...base, recibio: "", hora: "" }).success).toBe(false);
});

test("errores del backend tal cual: los de campo bajo su input, el resto al banner", () => {
  const futura = collectFieldErrors();
  expect(
    parseDeliverShipmentError(
      axiosError(400, { fecha_entrega: "La fecha de entrega no puede ser futura." }),
      futura.set,
    ),
  ).toBeNull();
  expect(futura.errors).toEqual({ hora: "La fecha de entrega no puede ser futura." });

  const entregado = collectFieldErrors();
  expect(
    parseDeliverShipmentError(
      axiosError(400, { despacho: "El despacho ya está marcado como entregado." }),
      entregado.set,
    ),
  ).toBe("El despacho ya está marcado como entregado.");
  expect(entregado.errors).toEqual({});

  const sinPermiso = collectFieldErrors();
  expect(
    parseDeliverShipmentError(
      axiosError(403, { detail: "No tienes permiso para esta acción (C-WMS-ENVIO)." }),
      sinPermiso.set,
    ),
  ).toBe("No tienes permiso para esta acción (C-WMS-ENVIO).");

  expect(parseDeliverShipmentError(axiosError(500, "<html>"), collectFieldErrors().set)).toBe(
    "No se pudo registrar la entrega.",
  );
});

const docs = (): PedidoDocumentos =>
  ({
    despachos: [
      { id: 54, guia: "", envio_id: null, packing_id: 62, packing_folio: "PACK-18", estado: "ACTIVO", fecha_entrega: null },
      { id: 55, guia: "", envio_id: null, packing_id: 63, packing_folio: "PACK-19", estado: "ACTIVO", fecha_entrega: null },
    ],
  }) as unknown as PedidoDocumentos;

test("la entrega se escribe en los documentos del pedido en caché, solo en su fila", async () => {
  const before = docs();
  const after = patchDocumentosDespacho(before, { id: 54, estado: "ACTIVO", fecha_entrega: ENTREGA });
  expect(after?.despachos[0]).toMatchObject({ id: 54, estado: "ACTIVO", fecha_entrega: ENTREGA });
  expect(after?.despachos[1]).toBe(before.despachos[1]);
  // Sin `fecha_entrega` en la respuesta no se toca la que ya había.
  expect(patchDocumentosDespacho(after, { id: 54, estado: "ACTIVO" })?.despachos[0].fecha_entrega).toBe(ENTREGA);

  const qc = new QueryClient();
  qc.setQueryData(pedidoDocumentosQueryKey(2129), docs());
  await writeDespachoToPedidoDocumentos(qc, 2129, {
    id: 55,
    estado: "ACTIVO",
    fecha_entrega: ENTREGA,
  } as Shipment);
  const cached = qc.getQueryData<PedidoDocumentos>(pedidoDocumentosQueryKey(2129));
  expect(cached?.despachos.map((d) => d.fecha_entrega)).toEqual([null, ENTREGA]);
});

test("fecha y hora sin tocar: no viaja `fecha_entrega` y el backend usa su hora", () => {
  const defaults = { fecha: "2026-11-26", hora: "12:00" };
  // Aun con el reloj del equipo atrasado respecto de lo que se prellenó.
  const before = new Date("2026-11-26T17:58:00Z"); // 11:58 en México
  expect(buildDeliverShipmentPayload({ recibio: "", ...defaults }, defaults, before)).toEqual({ payload: {} });
  expect(buildDeliverShipmentPayload({ recibio: "Juan", ...defaults }, defaults, before)).toEqual({
    payload: { recibio: "Juan" },
  });
});

test("fecha u hora editadas: viaja `fecha_entrega` y se valida que no sea futura", () => {
  const defaults = { fecha: "2026-11-26", hora: "12:00" };
  const now = new Date("2026-11-26T18:00:00Z"); // 12:00 en México
  expect(buildDeliverShipmentPayload({ recibio: "", fecha: "2026-11-25", hora: "12:00" }, defaults, now)).toEqual({
    payload: { fecha_entrega: "2026-11-25T12:00:00-06:00" },
  });
  expect(buildDeliverShipmentPayload({ recibio: "Ana", fecha: "2026-11-26", hora: "09:15" }, defaults, now)).toEqual({
    payload: { recibio: "Ana", fecha_entrega: "2026-11-26T09:15:00-06:00" },
  });
  expect(buildDeliverShipmentPayload({ recibio: "", fecha: "2026-11-26", hora: "12:30" }, defaults, now)).toEqual({
    field: "hora",
    message: FECHA_ENTREGA_FUTURA_MESSAGE,
  });
});

test("la hoja Documentos dice Entregado con el mismo helper que WMS", () => {
  expect(shipmentDisplayStatus({ estado: "ACTIVO", fecha_entrega: ENTREGA })).toBe("ENTREGADO");
  expect(shipmentDisplayStatus({ estado: "ACTIVO", fecha_entrega: null })).toBe("ACTIVO");
  // Un estado que no es de despacho conocido pasa tal cual.
  expect(shipmentDisplayStatus({ estado: "CANCELADO", fecha_entrega: ENTREGA })).toBe("CANCELADO");
  expect(shipmentDisplayStatus({ estado: "OTRO" })).toBe("OTRO");
});

test("el 400 `despacho` cierra el diálogo; los de campo y el 403 no", () => {
  expect(isDeliverDespachoRejection(axiosError(400, { despacho: "El despacho está cancelado." }))).toBe(true);
  expect(isDeliverDespachoRejection(axiosError(400, { fecha_entrega: "Fecha inválida (ISO 8601)." }))).toBe(false);
  expect(isDeliverDespachoRejection(axiosError(403, { detail: "No tienes permiso" }))).toBe(false);
  expect(isDeliverDespachoRejection(axiosError(400, ["lista plana"]))).toBe(false);
});

test("el candado de doble envío ve la entrega en curso en cuanto se dispara", async () => {
  const qc = new QueryClient();
  let resolve: (value: unknown) => void = () => {};
  const observer = new MutationObserver(qc, {
    mutationKey: deliverShipmentMutationKey(58),
    mutationFn: () => new Promise((r) => (resolve = r)),
  });
  const isIdle = () => qc.isMutating({ mutationKey: deliverShipmentMutationKey(58), exact: true }) === 0;
  expect(isIdle()).toBe(true);
  const running = observer.mutate(undefined);
  // Síncrono, sin esperar un render: el segundo envío ya ve el candado.
  expect(isIdle()).toBe(false);
  expect(qc.isMutating({ mutationKey: deliverShipmentMutationKey(59), exact: true })).toBe(0);
  await new Promise((r) => setTimeout(r, 0)); // la mutationFn arranca tras un microtask
  resolve({});
  await running;
  expect(isIdle()).toBe(true);
});
