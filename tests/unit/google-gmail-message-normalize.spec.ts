import { expect, test } from "@playwright/test";
import {
  normalizeGmailMessage,
  normalizeGmailMessages,
} from "@/src/features/google/utils/normalizeGmailMessage";
import {
  getSenderInitials,
  parseSenderName,
  UNKNOWN_SENDER_LABEL,
} from "@/src/features/google/components/emails/email.utils";

/**
 * EC-903: el listado de Gmail devuelve `{id}` a secas cuando el backend no pudo
 * leer los metadatos de un mensaje. La fila no debe romper la bandeja.
 */
const FULL = {
  id: "m1",
  threadId: "t1",
  snippet: "Hola",
  subject: "Asunto",
  from: "Ana",
  from_full: "Ana López <ana@example.com>",
  to: "yo@example.com",
  date: "Tue, 17 Nov 2026 10:00:00 -0600",
};

test.describe("normalizeGmailMessage", () => {
  test("un mensaje completo queda igual", () => {
    expect(normalizeGmailMessage(FULL)).toEqual(FULL);
  });

  test("un mensaje que llega solo como {id} se completa con cadenas vacías", () => {
    expect(normalizeGmailMessage({ id: "m2" })).toEqual({
      id: "m2",
      threadId: "",
      snippet: "",
      subject: "",
      from: "",
      from_full: "",
      to: "",
      date: "",
    });
  });

  test("los null también se vuelven cadenas vacías", () => {
    const normalized = normalizeGmailMessage({ id: "m3", threadId: null, subject: null });
    expect(normalized.threadId).toBe("");
    expect(normalized.subject).toBe("");
  });

  test("el listado conserva el orden y descarta entradas sin id", () => {
    const result = normalizeGmailMessages([
      FULL,
      { id: "m2" },
      null,
      undefined,
      { id: "" },
      {} as never,
    ]);
    expect(result.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  test("un listado null o ausente da una lista vacía", () => {
    expect(normalizeGmailMessages(null)).toEqual([]);
    expect(normalizeGmailMessages(undefined)).toEqual([]);
  });

  test("la fila de un mensaje {id} se puede pintar sin TypeError", () => {
    const message = normalizeGmailMessage({ id: "m2" });
    const name = parseSenderName(message.from_full || message.from);
    expect(name).toBe(UNKNOWN_SENDER_LABEL);
    expect(getSenderInitials(name)).toBe("?");
  });

  test("el remitente con nombre sigue igual", () => {
    expect(parseSenderName(FULL.from_full)).toBe("Ana López");
    expect(getSenderInitials("Ana López")).toBe("AL");
    expect(parseSenderName("ana@example.com")).toBe("ana");
  });
});
