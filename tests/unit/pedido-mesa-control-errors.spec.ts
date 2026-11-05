import { expect, test } from "@playwright/test";
import {
  extractPedidoMesaControlRejectionMessage,
  pedidoMesaControlFieldIssues,
} from "@/src/features/orders/utils/pedidoMesaControlErrors";
import { extractQuoteValidationIssues } from "@/src/features/quotes/utils/quoteValidationErrors";

/**
 * EC-762: el 400 `servicios_extras` de `editar-mesa-control/` (servicios ya
 * facturados, #744) trae un mensaje por servicio. Todos llegan al toast y
 * ninguno queda como error de formulario sin control que lo pinte.
 */
const FACTURADO = "Bordado: está en la factura F-12; no se cambia su importe ni se oculta.";
const ELIMINADO = "Flete: ya se facturó; no se puede eliminar.";

/** Lo que `onError` del hook calcula a partir del cuerpo 400. */
const parse400 = (data: unknown) => ({
  message: extractPedidoMesaControlRejectionMessage(data),
  issues: pedidoMesaControlFieldIssues(extractQuoteValidationIssues(data)),
});

test.describe("rechazo servicios_extras de editar-mesa-control", () => {
  test("un solo mensaje llega tal cual al toast y no marca el formulario", () => {
    const { message, issues } = parse400({ servicios_extras: [FACTURADO] });
    expect(message).toBe(FACTURADO);
    expect(issues).toEqual([]);
  });

  test("varios mensajes llegan todos al toast, en orden", () => {
    const { message, issues } = parse400({ servicios_extras: [FACTURADO, ELIMINADO] });
    expect(message).toBe(`${FACTURADO} ${ELIMINADO}`);
    expect(issues).toEqual([]);
  });

  test("un string suelto también se acepta", () => {
    expect(extractPedidoMesaControlRejectionMessage({ servicios_extras: ELIMINADO })).toBe(
      ELIMINADO,
    );
  });

  test("los errores por servicio siguen marcando su campo y no van al toast", () => {
    const data = { servicios_extras: [{}, { monto: ["Asegúrese de que este valor sea mayor o igual a 0."] }] };
    const { message, issues } = parse400(data);
    expect(message).toBeUndefined();
    expect(issues).toEqual([
      {
        path: "servicios_extras.1.monto",
        message: "Asegúrese de que este valor sea mayor o igual a 0.",
      },
    ]);
  });
});

test.describe("otras claves del 400 no cambian", () => {
  test("un error de campo de la cabecera va al formulario, no al toast", () => {
    const { message, issues } = parse400({
      pedido: { persona_pagos: ["Este campo no puede estar en blanco."] },
    });
    expect(message).toBeUndefined();
    expect(issues).toEqual([
      { path: "persona_pagos", message: "Este campo no puede estar en blanco." },
    ]);
  });

  test("permiso sigue siendo el primer mensaje de su clave", () => {
    const { message, issues } = parse400({
      permiso: ["Acción disponible solo para mesa de control.", "otro"],
    });
    expect(message).toBe("Acción disponible solo para mesa de control.");
    // Comportamiento previo intacto: el filtro solo descarta `servicios_extras`.
    expect(issues).toEqual([
      { path: "permiso", message: "Acción disponible solo para mesa de control." },
    ]);
  });

  test("pedido como string plano es rechazo", () => {
    expect(
      extractPedidoMesaControlRejectionMessage({
        pedido: "El pedido no tiene cotización relacionada para sincronizar.",
      }),
    ).toBe("El pedido no tiene cotización relacionada para sincronizar.");
  });

  test("compatibilidad_proceso sigue mostrándose completa y antes que servicios_extras", () => {
    expect(
      extractPedidoMesaControlRejectionMessage({
        compatibilidad_proceso: ["A no admite bordado.", "B no admite reflejante."],
        servicios_extras: [FACTURADO],
      }),
    ).toBe("A no admite bordado. B no admite reflejante.");
  });

  test("color sigue marcando las partidas además del toast", () => {
    const { message, issues } = parse400({ color: "Elige el color de: Playera." });
    expect(message).toBe("Elige el color de: Playera.");
    expect(issues).toEqual([{ path: "color", message: "Elige el color de: Playera." }]);
  });
});
