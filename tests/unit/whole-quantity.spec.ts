import { expect, test } from "@playwright/test";
import {
  appendsDigitsAtEnd,
  isDecimalSeparatorKey,
  isPastableWholeQuantity,
  parseWholeQuantity,
  stepWholeQuantity,
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

test("tras un separador bloqueado, los dígitos agregados al final son la parte decimal", () => {
  // "1" + "." (bloqueado) + "5": el input mostraba "1" y llega "15".
  expect(appendsDigitsAtEnd("15", "1")).toBe(true);
  expect(appendsDigitsAtEnd("1275", "12")).toBe(true);
  // Reemplazar todo (foco selecciona), insertar antes o borrar no es agregar al final.
  expect(appendsDigitsAtEnd("3", "1")).toBe(false);
  expect(appendsDigitsAtEnd("21", "1")).toBe(false);
  expect(appendsDigitsAtEnd("1", "12")).toBe(false);
  expect(appendsDigitsAtEnd("1", "1")).toBe(false);
});
