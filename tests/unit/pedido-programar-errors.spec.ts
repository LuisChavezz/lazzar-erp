import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders } from "axios";
import { ORDERS_QUERY_KEY } from "@/src/features/orders/constants/ordersQueryKeys";
import {
  extractPedidoNoProgramableMessage,
  isMesaControlPermisoError,
  parseProgramarPedidoError,
  PEDIDO_PROGRAMAR_NOT_FOUND_MESSAGE,
  PEDIDO_PROGRAMAR_PERMISO_MESSAGE,
  withStaleProgramarRowRefresh,
} from "@/src/features/orders/utils/pedidoProgramarErrors";

/**
 * EC-781: el 400 de `GET`/`PATCH .../programar/` para un pedido CANCELADO o sin
 * confirmar (EC-750) trae el motivo en `estatus` o `fecha_confirmacion`, como
 * lista de DRF. El diálogo y el toast muestran ese mensaje. Un pedido cancelado
 * responde 404 (`activo=false`); los dos casos refrescan los listados.
 */
const CANCELADO = "El pedido está CANCELADO; no se puede programar.";
const SIN_CONFIRMAR = "Confirma el pedido antes de programarlo.";

const axiosError = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });

test.describe("extractPedidoNoProgramableMessage", () => {
  test("pedido cancelado: mensaje de `estatus`", () => {
    expect(extractPedidoNoProgramableMessage(axiosError(400, { estatus: [CANCELADO] }))).toBe(CANCELADO);
  });

  test("pedido sin confirmar: mensaje de `fecha_confirmacion`", () => {
    expect(
      extractPedidoNoProgramableMessage(axiosError(400, { fecha_confirmacion: [SIN_CONFIRMAR] })),
    ).toBe(SIN_CONFIRMAR);
  });

  test("con las dos claves gana `estatus`, el orden del backend", () => {
    expect(
      extractPedidoNoProgramableMessage(
        axiosError(400, { fecha_confirmacion: [SIN_CONFIRMAR], estatus: [CANCELADO] }),
      ),
    ).toBe(CANCELADO);
  });

  test("acepta el string suelto y salta los mensajes en blanco", () => {
    expect(extractPedidoNoProgramableMessage(axiosError(400, { estatus: CANCELADO }))).toBe(CANCELADO);
    expect(
      extractPedidoNoProgramableMessage(
        axiosError(400, { estatus: ["  "], fecha_confirmacion: [SIN_CONFIRMAR] }),
      ),
    ).toBe(SIN_CONFIRMAR);
  });

  test("otros 400, otros status y errores que no son de Axios: undefined", () => {
    const permiso = axiosError(400, { permiso: "Acción disponible solo para mesa de control." });
    expect(extractPedidoNoProgramableMessage(permiso)).toBeUndefined();
    expect(isMesaControlPermisoError(permiso)).toBe(true);
    expect(extractPedidoNoProgramableMessage(axiosError(400, { programaciones: ["Excede."] }))).toBeUndefined();
    expect(extractPedidoNoProgramableMessage(axiosError(404, { estatus: [CANCELADO] }))).toBeUndefined();
    expect(extractPedidoNoProgramableMessage(new Error(CANCELADO))).toBeUndefined();
    expect(extractPedidoNoProgramableMessage(undefined)).toBeUndefined();
  });
});

const SIN_PERMISO = "Acción disponible solo para mesa de control.";

test.describe("parseProgramarPedidoError (PATCH)", () => {
  test("400 sin confirmar: toast con el mensaje del backend y refresca la lista", () => {
    expect(parseProgramarPedidoError(axiosError(400, { fecha_confirmacion: [SIN_CONFIRMAR] }))).toEqual({
      issues: [],
      message: SIN_CONFIRMAR,
      refreshOrders: true,
    });
  });

  test("400 `estatus` (defensivo): mismo trato", () => {
    const result = parseProgramarPedidoError(axiosError(400, { estatus: [CANCELADO] }));
    expect(result.message).toBe(CANCELADO);
    expect(result.refreshOrders).toBe(true);
  });

  test("404 (pedido cancelado): conserva su mensaje y refresca la lista", () => {
    expect(parseProgramarPedidoError(axiosError(404, { detail: "No encontrado." }))).toEqual({
      issues: [],
      message: PEDIDO_PROGRAMAR_NOT_FOUND_MESSAGE,
      refreshOrders: true,
    });
  });

  test("`detail` gana por orden y no refresca la lista", () => {
    const result = parseProgramarPedidoError(
      axiosError(400, { detail: "Otro motivo.", fecha_confirmacion: [SIN_CONFIRMAR] }),
    );
    expect(result).toMatchObject({ message: "Otro motivo.", refreshOrders: false });
  });

  test("un mensaje en blanco se salta: toast y refresco salen de la misma clave", () => {
    expect(
      parseProgramarPedidoError(axiosError(400, { detail: ["  "], fecha_confirmacion: [SIN_CONFIRMAR] })),
    ).toMatchObject({ message: SIN_CONFIRMAR, refreshOrders: true });
    expect(parseProgramarPedidoError(axiosError(400, { fecha_confirmacion: [" "] }))).toMatchObject({
      message: "No se pudo guardar la programación",
      refreshOrders: false,
    });
  });

  test("sin rechazo cae al genérico; permiso y errores de campo no cambian", () => {
    expect(parseProgramarPedidoError(axiosError(500, {}))).toEqual({
      issues: [],
      message: "No se pudo guardar la programación",
      refreshOrders: false,
    });
    expect(parseProgramarPedidoError(axiosError(400, { permiso: SIN_PERMISO }))).toEqual({
      issues: [],
      message: PEDIDO_PROGRAMAR_PERMISO_MESSAGE,
      refreshOrders: false,
    });
    const campos = parseProgramarPedidoError(axiosError(400, { programaciones: ["Excede el total."] }));
    expect(campos.issues).toEqual([{ path: "programaciones", message: "Excede el total." }]);
    expect(campos).toMatchObject({ message: "Revisa la programación: hay errores marcados.", refreshOrders: false });
  });
});

test.describe("withStaleProgramarRowRefresh (GET del contexto)", () => {
  const run = async (error: unknown) => {
    const queryClient = new QueryClient();
    const calls: unknown[] = [];
    queryClient.invalidateQueries = (async (filters?: unknown) => {
      calls.push(filters);
    }) as QueryClient["invalidateQueries"];
    const load = withStaleProgramarRowRefresh(queryClient, () => Promise.reject(error));
    await expect(load()).rejects.toBe(error);
    return calls;
  };

  test("404 y 400 sin confirmar invalidan `[\"orders\"]` una vez y relanzan el error", async () => {
    expect(await run(axiosError(404, {}))).toEqual([{ queryKey: ORDERS_QUERY_KEY }]);
    expect(await run(axiosError(400, { fecha_confirmacion: [SIN_CONFIRMAR] }))).toEqual([
      { queryKey: ORDERS_QUERY_KEY },
    ]);
    expect(await run(axiosError(400, { estatus: [CANCELADO] }))).toEqual([{ queryKey: ORDERS_QUERY_KEY }]);
  });

  test("permiso, 500 y errores de red no invalidan nada", async () => {
    expect(await run(axiosError(400, { permiso: SIN_PERMISO }))).toEqual([]);
    expect(await run(axiosError(500, {}))).toEqual([]);
    expect(await run(new Error("Network Error"))).toEqual([]);
  });

  test("una lectura correcta devuelve los datos sin invalidar", async () => {
    const queryClient = new QueryClient();
    let calls = 0;
    queryClient.invalidateQueries = (async () => {
      calls += 1;
    }) as QueryClient["invalidateQueries"];
    await expect(withStaleProgramarRowRefresh(queryClient, async () => 42)()).resolves.toBe(42);
    expect(calls).toBe(0);
  });
});
