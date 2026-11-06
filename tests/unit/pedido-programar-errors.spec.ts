import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  extractPedidoNoProgramableMessage,
  isMesaControlPermisoError,
} from "@/src/features/orders/utils/pedidoProgramarErrors";

/**
 * EC-781: el 400 de `GET`/`PATCH .../programar/` para un pedido CANCELADO o sin
 * confirmar (EC-750) trae el motivo en `estatus` o `fecha_confirmacion`, como
 * lista de DRF. El diálogo y el toast muestran ese mensaje.
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
