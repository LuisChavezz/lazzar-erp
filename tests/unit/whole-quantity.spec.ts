import { expect, test } from "@playwright/test";
import {
  isDecimalSeparatorKey,
  isPastableWholeQuantity,
  parseWholeQuantity,
  reduceWholeQuantity,
  stepWholeQuantity,
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
        aplicar({ type: "text", raw: shown.slice(0, a) + shown.slice(b), shown, min });
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
