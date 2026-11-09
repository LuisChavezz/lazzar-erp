import { expect, test } from "@playwright/test";
import {
  firstDrfMessage,
  firstNonBlankDrfMessage,
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
