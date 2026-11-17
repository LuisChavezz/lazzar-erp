import { expect, test } from "@playwright/test";
import {
  firstDrfMessage,
  firstNonBlankDrfMessage,
  firstNestedDrfMessage,
  firstNestedFieldMessage,
  firstNonBlankRejectionMessage,
} from "@/src/utils/firstDrfMessage";

test.describe("firstNonBlankDrfMessage", () => {
  test("lee string o lista y salta los mensajes en blanco", () => {
    expect(firstNonBlankDrfMessage("Motivo.")).toBe("Motivo.");
    expect(firstNonBlankDrfMessage(["  ", "", "Motivo."])).toBe("Motivo.");
    expect(firstNonBlankDrfMessage("   ")).toBeUndefined();
    expect(firstNonBlankDrfMessage([{ campo: ["x"] }])).toBeUndefined();
    expect(firstNonBlankDrfMessage(undefined)).toBeUndefined();
  });

  test("firstDrfMessage conserva su semántica (acepta solo espacios)", () => {
    expect(firstDrfMessage("   ")).toBe("   ");
  });
});

test.describe("firstNonBlankRejectionMessage", () => {
  test("recorre las claves en orden y salta las que están en blanco", () => {
    expect(firstNonBlankRejectionMessage({ a: [" "], b: "B." }, ["a", "b"])).toBe("B.");
    expect(firstNonBlankRejectionMessage({ a: "A.", b: "B." }, ["a", "b"])).toBe("A.");
    expect(firstNonBlankRejectionMessage({ a: " " }, ["a"])).toBeUndefined();
    expect(firstNonBlankRejectionMessage(null, ["a"])).toBeUndefined();
  });
});

// Cuerpos 400 reales de POST /produccion/orden-produccion/onboarding/ (EC-898).
test.describe("firstNestedDrfMessage", () => {
  test("renglón anidado como diccionario por índice", () => {
    const body = {
      orden_produccion_detalle: { "1": { cantidad: ["Asegúrese de que no haya más de 2 decimales."] } },
    };
    expect(firstNestedDrfMessage(body)).toBe("Renglón 2: Asegúrese de que no haya más de 2 decimales.");
  });

  test("renglón anidado como lista con {} en los renglones válidos", () => {
    const body = {
      orden_produccion_detalle: [
        {},
        { pedido_detalle: ["El renglón no pertenece a los pedidos de la orden de producción."] },
      ],
    };
    expect(firstNestedDrfMessage(body)).toBe(
      "Renglón 2: El renglón no pertenece a los pedidos de la orden de producción.",
    );
  });

  test("un rechazo plano sale tal cual, string o lista", () => {
    const inventario = "Existencia insuficiente para SATIN. Requerido: 40500.0000, disponible: 578.0000.";
    expect(firstNestedDrfMessage({ inventario })).toBe(inventario);
    expect(firstNestedDrfMessage({ cantidad: ["", "Requerido."] })).toBe("Requerido.");
    expect(firstNestedDrfMessage(["Sin sucursal."])).toBe("Sin sucursal.");
  });

  test("los mensajes planos ganan a los anidados, y detail/non_field_errors a los demás", () => {
    expect(
      firstNestedDrfMessage({ detalle: [{ cantidad: ["Anidado."] }], inventario: "Plano." }),
    ).toBe("Plano.");
    expect(firstNestedDrfMessage({ campo: ["Campo."], non_field_errors: ["General."] })).toBe("General.");
  });

  test("conserva el renglón más externo y salta los mensajes en blanco", () => {
    expect(
      firstNestedDrfMessage({ lineas: [{}, {}, { tallas: [{ cantidad: ["  "] }, { cantidad: ["Mal."] }] }] }),
    ).toBe("Renglón 3: Mal.");
    expect(firstNestedDrfMessage({ lineas: [{ non_field_errors: ["Una sola variante."] }] })).toBe(
      "Renglón 1: Una sola variante.",
    );
  });

  test("sin mensaje utilizable devuelve undefined, nunca un objeto", () => {
    expect(firstNestedDrfMessage({ orden_produccion_detalle: [{}, {}] })).toBeUndefined();
    expect(firstNestedDrfMessage({ campo: "   " })).toBeUndefined();
    expect(firstNestedDrfMessage("<html>Server Error</html>")).toBeUndefined();
    expect(firstNestedDrfMessage(null)).toBeUndefined();
    expect(firstNestedDrfMessage({ campo: [42, null] })).toBeUndefined();
  });
});

test.describe("firstNestedDrfMessage: renglón por forma, no por clave", () => {
  test("clave numérica con errores de campo = renglón", () => {
    expect(firstNestedDrfMessage({ detalle: { "1": { cantidad: ["Mal."] } } })).toBe("Renglón 2: Mal.");
  });

  test("clave numérica con mensajes directos = id de registro, sin renglón", () => {
    expect(firstNestedDrfMessage({ detalles_override: { "5123": ["cantidad excede"] } })).toBe(
      "cantidad excede",
    );
    expect(firstNestedDrfMessage({ detalles_override: { "5123": "cantidad excede" } })).toBe(
      "cantidad excede",
    );
  });
});

test.describe("firstNestedFieldMessage", () => {
  test("string, lista o anidado: siempre un string", () => {
    expect(firstNestedFieldMessage("Requerido.")).toBe("Requerido.");
    expect(firstNestedFieldMessage(["", "Requerido."])).toBe("Requerido.");
    expect(firstNestedFieldMessage([{ sub: ["Anidado."] }])).toBe("Renglón 1: Anidado.");
    expect(firstNestedFieldMessage({ sub: ["Anidado."] })).toBe("Anidado.");
  });

  test("sin mensaje devuelve undefined", () => {
    expect(firstNestedFieldMessage(undefined)).toBeUndefined();
    expect(firstNestedFieldMessage([{}, "  "])).toBeUndefined();
  });
});
