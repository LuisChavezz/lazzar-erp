import { expect, test } from "@playwright/test";
import { capturaManualRecepcion } from "@/src/features/receipts/utils/receiptQuantities";
import {
  isDecimalSeparatorKey,
  isPastableWholeQuantity,
  parseWholeQuantity,
  reduceWholeQuantity,
  stepWholeQuantity,
  truncateFractionDeletion,
  WHOLE_QUANTITY_IDLE,
  type WholeQuantityEvent,
  type WholeQuantityState,
} from "@/src/utils/wholeQuantity";

/** EC-900: `QuantitySelector` solo acepta enteros y nunca convierte "1.5" en 15. */

test("un texto que no es entero se rechaza en lugar de convertirse", () => {
  expect(parseWholeQuantity("1.5", 0)).toBeNull();
  expect(parseWholeQuantity("1,5", 0)).toBeNull();
  expect(parseWholeQuantity("10.", 0)).toBeNull();
  expect(parseWholeQuantity("2a", 1)).toBeNull();
  expect(parseWholeQuantity("-3", 0)).toBeNull();
  expect(parseWholeQuantity(" 4", 0)).toBeNull();
});

test("los dígitos se aceptan, con `min` como piso y para el input vacío", () => {
  expect(parseWholeQuantity("15", 0)).toBe(15);
  expect(parseWholeQuantity("007", 0)).toBe(7);
  expect(parseWholeQuantity("0", 1)).toBe(1);
  expect(parseWholeQuantity("", 1)).toBe(1);
  expect(parseWholeQuantity("", 0)).toBe(0);
});

test("se bloquean los separadores al teclear y al pegar", () => {
  expect(isDecimalSeparatorKey(".")).toBe(true);
  expect(isDecimalSeparatorKey(",")).toBe(true);
  expect(isDecimalSeparatorKey("Decimal")).toBe(true);
  expect(isDecimalSeparatorKey("5")).toBe(false);
  expect(isDecimalSeparatorKey("Backspace")).toBe(false);
  expect(isPastableWholeQuantity("1.5")).toBe(false);
  expect(isPastableWholeQuantity("1,5")).toBe(false);
  expect(isPastableWholeQuantity(" 12 ")).toBe(true);
  expect(isPastableWholeQuantity("")).toBe(false);
});

test("los pasos sobre un valor fraccionario van al entero de al lado", () => {
  expect(stepWholeQuantity(10.5, -1, 0)).toBe(10);
  expect(stepWholeQuantity(10.5, 1, 0)).toBe(11);
  expect(stepWholeQuantity(0.5, -1, 0)).toBe(0);
  expect(stepWholeQuantity(0.5, 1, 0)).toBe(1);
  expect(stepWholeQuantity(3, -1, 0)).toBe(2);
  expect(stepWholeQuantity(3, 1, 0)).toBe(4);
  expect(stepWholeQuantity(1, -1, 1)).toBe(1);
});

/**
 * Simula el input de `QuantitySelector` sobre el reducer: el texto mostrado,
 * la selección y lo que hace el navegador si no se cancela la acción. Igual que
 * el input controlado, un cambio rechazado vuelve a mostrar el valor actual con
 * el cursor al final.
 */
type Paso =
  | { tecla: string }
  | { pegar: string }
  | { clicAlFinal: true }
  | { seleccionar: [number, number] }
  | { paso: -1 | 1 }
  | { salir: true };

function capturar(inicial: number, pasos: Paso[], min = 0) {
  let value = inicial;
  let state: WholeQuantityState = WHOLE_QUANTITY_IDLE;
  // Al enfocar, el selector selecciona todo su texto.
  let sel: [number, number] = [0, String(value).length];
  const insertar = (texto: string) => {
    const shown = String(value);
    const raw = shown.slice(0, sel[0]) + texto + shown.slice(sel[1]);
    aplicar({ type: "text", raw, shown, min });
  };
  const aplicar = (event: WholeQuantityEvent) => {
    const r = reduceWholeQuantity(state, event);
    state = r.state;
    if (r.value !== undefined) value = r.value;
    const fin = String(value).length;
    sel = [fin, fin];
    return r;
  };
  for (const p of pasos) {
    if ("tecla" in p) {
      const r = reduceWholeQuantity(state, { type: "key", key: p.tecla });
      state = r.state;
      if (r.preventDefault) continue;
      if (p.tecla === "Backspace") {
        const shown = String(value);
        const [a, b] = sel[0] === sel[1] ? [Math.max(0, sel[0] - 1), sel[1]] : sel;
        aplicar({ type: "text", raw: shown.slice(0, a) + shown.slice(b), shown, min, deletion: true });
      } else if (p.tecla.length === 1) {
        insertar(p.tecla);
      }
    } else if ("pegar" in p) {
      const r = aplicar({ type: "paste", text: p.pegar, min });
      if (!r.preventDefault) {
        sel = [0, String(value).length]; // el foco seleccionó todo
        insertar(p.pegar);
      }
    } else if ("clicAlFinal" in p) {
      aplicar({ type: "pointer" });
    } else if ("seleccionar" in p) {
      state = reduceWholeQuantity(state, { type: "pointer" }).state;
      sel = p.seleccionar;
    } else if ("paso" in p) {
      aplicar({ type: "step", value, direction: p.paso, min });
    } else {
      aplicar({ type: "blur" });
    }
  }
  return { value, hint: state.showHint };
}

const teclas = (texto: string): Paso[] => [...texto].map((tecla) => ({ tecla }));

test.describe("reduceWholeQuantity: secuencias de captura", () => {
  test("\"1.5\" y \"1,5\" dejan 1 con el aviso, nunca 15", () => {
    expect(capturar(0, teclas("1.5"))).toEqual({ value: 1, hint: true });
    expect(capturar(0, teclas("1,5"))).toEqual({ value: 1, hint: true });
    expect(capturar(0, teclas("12.75"))).toEqual({ value: 12, hint: true });
  });

  test("\".5\" y \",5\" sobre el texto seleccionado no dejan 5", () => {
    expect(capturar(0, teclas(".5"))).toEqual({ value: 0, hint: true });
    expect(capturar(3, teclas(",5"))).toEqual({ value: 3, hint: true });
  });

  test("una letra solo se rechaza: \"1\" \"a\" \"0\" deja 10", () => {
    expect(capturar(0, teclas("1a0"))).toEqual({ value: 10, hint: false });
    expect(capturar(0, teclas("1-"))).toEqual({ value: 1, hint: true });
  });

  test("tras el separador, mover el cursor con el mouse o borrar vuelve a capturar", () => {
    expect(capturar(0, [...teclas("1."), { clicAlFinal: true }, { tecla: "0" }])).toEqual({ value: 10, hint: false });
    expect(capturar(0, [...teclas("1."), { tecla: "ArrowRight" }, { tecla: "0" }])).toEqual({ value: 10, hint: false });
    expect(capturar(0, [...teclas("12."), { tecla: "Backspace" }, { tecla: "3" }])).toEqual({ value: 13, hint: false });
    expect(capturar(0, [...teclas("1."), { salir: true }, { tecla: "0" }])).toEqual({ value: 10, hint: false });
  });

  test("un separador que no pasa por keydown (teclado móvil) también bloquea la parte decimal", () => {
    let state = WHOLE_QUANTITY_IDLE;
    const r1 = reduceWholeQuantity(state, { type: "text", raw: "1.", shown: "1", min: 0 });
    expect(r1).toEqual({ state: { fractionBlocked: true, showHint: true } });
    state = r1.state;
    expect(reduceWholeQuantity(state, { type: "text", raw: "15", shown: "1", min: 0 }).value).toBeUndefined();
  });

  test("pegar un decimal se cancela con el aviso", () => {
    expect(capturar(4, [{ pegar: "1.5" }])).toEqual({ value: 4, hint: true });
    expect(capturar(4, [{ pegar: "1,5" }])).toEqual({ value: 4, hint: true });
    expect(capturar(4, [{ pegar: "12" }])).toEqual({ value: 12, hint: false });
  });

  test("pegar un entero con espacios alrededor toma el entero recortado", () => {
    expect(capturar(4, [{ pegar: " 12 " }])).toEqual({ value: 12, hint: false });
    expect(capturar(4, [{ pegar: "12	" }])).toEqual({ value: 12, hint: false });
    expect(capturar(4, [{ pegar: " 0 " }], 1)).toEqual({ value: 1, hint: false });
  });

  test("un valor fraccionario fijado por \"Todo\" va al entero de al lado con \"−\" / \"+\"", () => {
    expect(capturar(10.5, [{ paso: -1 }])).toEqual({ value: 10, hint: false });
    expect(capturar(10.5, [{ paso: 1 }])).toEqual({ value: 11, hint: false });
    expect(capturar(0.5, [{ paso: -1 }])).toEqual({ value: 0, hint: false });
    // Teclear sobre el 10.5 seleccionado lo reemplaza por un entero.
    expect(capturar(10.5, teclas("7"))).toEqual({ value: 7, hint: false });
  });
});

/** EC-924: borrar los decimales de un valor fijado por "Todo" lo deja en el entero. */
test.describe("truncateFractionDeletion: borrar decimales trunca al entero", () => {
  test("borrar solo de la parte decimal deja la parte entera", () => {
    expect(truncateFractionDeletion("10.", "10.5", 0)).toBe(10);
    expect(truncateFractionDeletion("10.2", "10.25", 0)).toBe(10);
    expect(truncateFractionDeletion("10.5", "10.25", 0)).toBe(10);
    expect(truncateFractionDeletion("0.", "0.5", 0)).toBe(0);
    expect(truncateFractionDeletion("0.", "0.5", 1)).toBe(1);
  });

  test("lo que no es borrar decimales de un fraccionario no se trunca", () => {
    // Borrar en la parte entera.
    expect(truncateFractionDeletion("1.5", "10.5", 0)).toBeNull();
    // Escribir o reemplazar un decimal.
    expect(truncateFractionDeletion("10.7", "10.5", 0)).toBeNull();
    expect(truncateFractionDeletion("10.3", "10.25", 0)).toBeNull();
    expect(truncateFractionDeletion("10.57", "10.5", 0)).toBeNull();
    // El valor mostrado ya era entero: "10." solo pudo llegar escribiendo.
    expect(truncateFractionDeletion("10.", "10", 0)).toBeNull();
    expect(truncateFractionDeletion("1.", "10", 0)).toBeNull();
    // La coma nunca se muestra (`String(value)` usa "."): solo pudo escribirse.
    expect(truncateFractionDeletion("10,", "10.5", 0)).toBeNull();
  });
});

test.describe("reduceWholeQuantity: borrar sobre un valor fraccionario (EC-924)", () => {
  const borrar = (raw: string, shown: string, min = 0) =>
    reduceWholeQuantity(WHOLE_QUANTITY_IDLE, { type: "text", raw, shown, min, deletion: true });

  test("Backspace al final de \"10.5\" deja 10 sin aviso (antes se quedaba en 10.5)", () => {
    expect(capturar(10.5, [{ clicAlFinal: true }, { tecla: "Backspace" }])).toEqual({ value: 10, hint: false });
    expect(capturar(10.25, [{ clicAlFinal: true }, { tecla: "Backspace" }])).toEqual({ value: 10, hint: false });
    expect(capturar(0.5, [{ clicAlFinal: true }, { tecla: "Backspace" }])).toEqual({ value: 0, hint: false });
    // Un Backspace más ya borra sobre el entero.
    expect(capturar(10.5, [{ clicAlFinal: true }, { tecla: "Backspace" }, { tecla: "Backspace" }])).toEqual({
      value: 1,
      hint: false,
    });
  });

  test("los demás borrados siguen como antes", () => {
    // Borrar "5" y "." juntos (selección) o solo el ".": son dígitos.
    expect(borrar("10", "10.5")).toEqual({ state: WHOLE_QUANTITY_IDLE, value: 10 });
    expect(borrar("105", "10.5")).toEqual({ state: WHOLE_QUANTITY_IDLE, value: 105 });
    // Borrar todo: `min`.
    expect(borrar("", "10.5", 0)).toEqual({ state: WHOLE_QUANTITY_IDLE, value: 0 });
    // Borrar el "0" deja un decimal nuevo: se rechaza con el aviso.
    expect(borrar("1.5", "10.5")).toEqual({ state: { fractionBlocked: true, showHint: true } });
  });

  test("escribir un decimal se sigue rechazando con el aviso", () => {
    expect(reduceWholeQuantity(WHOLE_QUANTITY_IDLE, { type: "text", raw: "10.7", shown: "10", min: 0 })).toEqual({
      state: { fractionBlocked: true, showHint: true },
    });
    expect(reduceWholeQuantity(WHOLE_QUANTITY_IDLE, { type: "text", raw: "10.57", shown: "10.5", min: 0 })).toEqual({
      state: { fractionBlocked: true, showHint: true },
    });
    expect(capturar(0, teclas("10.7"))).toEqual({ value: 10, hint: true });
    expect(capturar(0, teclas("1.5"))).toEqual({ value: 1, hint: true });
    expect(capturar(10.5, [{ clicAlFinal: true }, ...teclas("7")])).toEqual({ value: 10.5, hint: true });
    // Teclear sobre decimales seleccionados deja un texto igual al de un borrado ("10.2", "10.5"), pero no lo es.
    expect(capturar(10.25, [{ seleccionar: [3, 5] }, ...teclas("2")])).toEqual({ value: 10.25, hint: true });
    expect(capturar(10.25, [{ seleccionar: [3, 5] }, ...teclas("5")])).toEqual({ value: 10.25, hint: true });
    expect(reduceWholeQuantity(WHOLE_QUANTITY_IDLE, { type: "text", raw: "10.5", shown: "10.25", min: 0 })).toEqual({
      state: { fractionBlocked: true, showHint: true },
    });
  });

  test("sobre un valor entero nada cambia", () => {
    expect(borrar("1", "10")).toEqual({ state: WHOLE_QUANTITY_IDLE, value: 1 });
    expect(borrar("", "10", 1)).toEqual({ state: WHOLE_QUANTITY_IDLE, value: 1 });
    expect(reduceWholeQuantity(WHOLE_QUANTITY_IDLE, { type: "text", raw: "10.", shown: "10", min: 0 })).toEqual({
      state: { fractionBlocked: true, showHint: true },
    });
  });

  test("el entero truncado pasa por el tope manual de la recepción como cualquier captura", () => {
    // Pendiente 10.5, "Todo" fijó 10.5: Backspace deja 10, dentro del tope manual (10).
    const truncado = borrar("10.", "10.5").value!;
    expect(capturaManualRecepcion(truncado, 10.5, 10.5)).toBe(10);
    // Pendiente 0.5: el 0 truncado queda en 0.
    expect(capturaManualRecepcion(borrar("0.", "0.5").value!, 0.5, 0.5)).toBe(0);
    // Borrar solo el "." da 105, por encima del tope: lo tecleado se topa en 10.
    expect(capturaManualRecepcion(borrar("105", "10.5").value!, 10.5, 10.5, true)).toBe(10);
  });
});
