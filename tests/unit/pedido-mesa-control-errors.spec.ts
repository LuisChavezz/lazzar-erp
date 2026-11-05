import { expect, test } from "@playwright/test";
import {
  parsePedidoMesaControl400,
  SERVICIOS_EXTRAS_MULTI_TOAST_DURATION_MS,
} from "@/src/features/orders/utils/pedidoMesaControlErrors";
import { extractProcessCompatibilityMessage } from "@/src/features/quotes/utils/quoteValidationErrors";
import { extractJoinedRejectionMessage } from "@/src/utils/firstDrfMessage";

/**
 * EC-762: el cuerpo 400 de `editar-mesa-control/` pasa por
 * `parsePedidoMesaControl400`, la misma función que llama
 * `useUpdatePedidoMesaControl`: `issues` van al formulario y `rejection` al
 * toast.
 */
const FACTURADO = "Bordado: está en la factura F-12; no se cambia su importe ni se oculta.";
const ELIMINADO = "Flete: ya se facturó; no se puede eliminar.";

test.describe("rechazo servicios_extras", () => {
  test("un solo mensaje llega tal cual al toast, sin duración propia ni error de formulario", () => {
    expect(parsePedidoMesaControl400({ servicios_extras: [FACTURADO] })).toEqual({
      issues: [],
      rejection: { message: FACTURADO },
    });
  });

  test("varios mensajes: uno por línea y un toast más largo", () => {
    expect(parsePedidoMesaControl400({ servicios_extras: [FACTURADO, ELIMINADO] })).toEqual({
      issues: [],
      rejection: {
        message: `${FACTURADO}\n${ELIMINADO}`,
        duration: SERVICIOS_EXTRAS_MULTI_TOAST_DURATION_MS,
      },
    });
  });

  test("un string suelto también se acepta", () => {
    expect(parsePedidoMesaControl400({ servicios_extras: ELIMINADO }).rejection).toEqual({
      message: ELIMINADO,
    });
  });

  test("strings de solo espacios no dan un toast en blanco ni un error de formulario", () => {
    expect(parsePedidoMesaControl400({ servicios_extras: ["  ", ""] })).toEqual({
      issues: [],
      rejection: undefined,
    });
  });

  test("los errores por servicio siguen marcando su campo y no van al toast", () => {
    const parsed = parsePedidoMesaControl400({
      servicios_extras: [{}, { monto: ["Asegúrese de que este valor sea mayor o igual a 0."] }],
    });
    expect(parsed).toEqual({
      issues: [
        {
          path: "servicios_extras.1.monto",
          message: "Asegúrese de que este valor sea mayor o igual a 0.",
        },
      ],
      rejection: undefined,
    });
  });
});

test.describe("claves de rechazo: toast sin error de formulario invisible", () => {
  for (const key of ["permiso", "cotizacion", "detail"]) {
    test(`${key} como lista va al toast con su primer mensaje y no al formulario`, () => {
      expect(parsePedidoMesaControl400({ [key]: ["Motivo.", "Otro."] })).toEqual({
        issues: [],
        rejection: { message: "Motivo." },
      });
    });
  }

  test("pedido como string plano es rechazo", () => {
    const message = "El pedido no tiene cotización relacionada para sincronizar.";
    expect(parsePedidoMesaControl400({ pedido: message })).toEqual({
      issues: [],
      rejection: { message },
    });
  });

  test("pedido como lista también va solo al toast", () => {
    expect(parsePedidoMesaControl400({ pedido: ["Sin cotización."] })).toEqual({
      issues: [],
      rejection: { message: "Sin cotización." },
    });
  });

  test("permiso de solo espacios cae al mensaje genérico (sin toast en blanco)", () => {
    expect(parsePedidoMesaControl400({ permiso: ["   "] }).rejection).toBeUndefined();
  });
});

test.describe("claves que no cambian", () => {
  test("un error de campo de la cabecera va al formulario, no al toast", () => {
    expect(
      parsePedidoMesaControl400({
        pedido: { persona_pagos: ["Este campo no puede estar en blanco."] },
      }),
    ).toEqual({
      issues: [{ path: "persona_pagos", message: "Este campo no puede estar en blanco." }],
      rejection: undefined,
    });
  });

  test("solo se descarta la clave PLANA pedido: sus errores anidados siguen en el formulario", () => {
    // Anidado: errores de campo de la cabecera, con el alias del formulario.
    expect(
      parsePedidoMesaControl400({
        pedido: {
          cliente_rfc: ["RFC inválido."],
          codigo_postal: ["Código postal inexistente."],
        },
      }),
    ).toEqual({
      issues: [
        { path: "rfc", message: "RFC inválido." },
        { path: "codigoPostalEnvio", message: "Código postal inexistente." },
      ],
      rejection: undefined,
    });
    // Plano: rechazo, solo toast.
    expect(parsePedidoMesaControl400({ pedido: ["Sin cotización."] }).issues).toEqual([]);
  });

  test("color va al toast Y al formulario, que lo traduce a las partidas", () => {
    expect(parsePedidoMesaControl400({ color: ["Elige el color de: Playera."] })).toEqual({
      issues: [{ path: "color", message: "Elige el color de: Playera." }],
      rejection: { message: "Elige el color de: Playera." },
    });
  });

  test("compatibilidad_proceso se muestra completa, en una línea, y gana a servicios_extras", () => {
    expect(
      parsePedidoMesaControl400({
        compatibilidad_proceso: ["A no admite bordado.", "B no admite reflejante."],
        servicios_extras: [FACTURADO, ELIMINADO],
      }),
    ).toEqual({
      issues: [],
      rejection: { message: "A no admite bordado. B no admite reflejante." },
    });
  });
});

test.describe("extractJoinedRejectionMessage", () => {
  test("une con espacio por defecto y con el separador pedido", () => {
    const data = { k: ["a", " ", "b"] };
    expect(extractJoinedRejectionMessage(data, "k")).toBe("a b");
    expect(extractJoinedRejectionMessage(data, "k", "\n")).toBe("a\nb");
  });

  test("sin la clave, sin mensajes o con un cuerpo que no es objeto da undefined", () => {
    expect(extractJoinedRejectionMessage({}, "k")).toBeUndefined();
    expect(extractJoinedRejectionMessage({ k: [] }, "k")).toBeUndefined();
    expect(extractJoinedRejectionMessage(["k"], "k")).toBeUndefined();
    expect(extractJoinedRejectionMessage("k", "k")).toBeUndefined();
  });

  test("compatibilidad_proceso conserva su comportamiento", () => {
    expect(
      extractProcessCompatibilityMessage({ compatibilidad_proceso: ["A.", "", "B."] }),
    ).toBe("A. B.");
    expect(extractProcessCompatibilityMessage({ compatibilidad_proceso: "Solo." })).toBe("Solo.");
    expect(extractProcessCompatibilityMessage({})).toBeUndefined();
  });
});
