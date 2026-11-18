import { expect, test } from "@playwright/test";
import {
  CalendarEventsPaginationError,
  fetchAllCalendarEventPages,
} from "@/src/features/google/utils/fetchAllCalendarEventPages";
import type {
  GoogleCalendarEvent,
  GoogleEventsResponse,
} from "@/src/features/google/interfaces/google.interface";

/**
 * EC-903: el calendario ignoraba `nextPageToken` y perdía los eventos después
 * del 250. `fetchAllCalendarEventPages` sigue el token hasta el final.
 */
const event = (id: string): GoogleCalendarEvent => ({
  id,
  summary: id,
  description: "",
  htmlLink: "",
  start: "2026-11-18T10:00:00-06:00",
  end: "2026-11-18T11:00:00-06:00",
  status: "confirmed",
  creator: "",
  updated: "",
  location: "",
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => event(`e${from + i}`));

/** Backend falso: `pages[token]` es la respuesta de cada token ("" = primera). */
const fakeBackend = (pages: Record<string, GoogleEventsResponse>) => {
  const calls: Array<string | undefined> = [];
  const fetchPage = async (pageToken: string | undefined) => {
    calls.push(pageToken);
    const page = pages[pageToken ?? ""];
    if (!page) throw new Error(`token inesperado ${pageToken}`);
    return page;
  };
  return { calls, fetchPage };
};

test.describe("fetchAllCalendarEventPages", () => {
  test("una sola página: una petición, sin token", async () => {
    const { calls, fetchPage } = fakeBackend({ "": { ok: true, events: range(0, 3) } });
    const result = await fetchAllCalendarEventPages(fetchPage);
    expect(calls).toEqual([undefined]);
    expect(result.events.map((e) => e.id)).toEqual(["e0", "e1", "e2"]);
    expect(result.nextPageToken).toBeUndefined();
  });

  test("más de 250 eventos: sigue nextPageToken y no pierde ninguno, en orden", async () => {
    const { calls, fetchPage } = fakeBackend({
      "": { ok: true, events: range(0, 250), nextPageToken: "p2" },
      p2: { ok: true, events: range(250, 500), nextPageToken: "p3" },
      p3: { ok: true, events: range(500, 612), nextPageToken: undefined },
    });
    const result = await fetchAllCalendarEventPages(fetchPage);
    expect(calls).toEqual([undefined, "p2", "p3"]);
    expect(result.events).toHaveLength(612);
    expect(result.events[0].id).toBe("e0");
    expect(result.events[250].id).toBe("e250");
    expect(result.events[611].id).toBe("e611");
  });

  test("un nextPageToken null o vacío termina la paginación", async () => {
    const { calls, fetchPage } = fakeBackend({
      "": { ok: true, events: range(0, 2), nextPageToken: "p2" },
      p2: { ok: true, events: range(2, 3), nextPageToken: null as unknown as string },
    });
    expect((await fetchAllCalendarEventPages(fetchPage)).events).toHaveLength(3);
    expect(calls).toEqual([undefined, "p2"]);

    const empty = fakeBackend({ "": { ok: true, events: [], nextPageToken: "" } });
    expect((await fetchAllCalendarEventPages(empty.fetchPage)).events).toEqual([]);
  });

  test("una página sin `events` cuenta como vacía", async () => {
    const { fetchPage } = fakeBackend({
      "": { ok: true, events: range(0, 1), nextPageToken: "p2" },
      p2: { ok: true } as GoogleEventsResponse,
    });
    expect((await fetchAllCalendarEventPages(fetchPage)).events).toHaveLength(1);
  });

  test("si falla una página intermedia, rechaza con ese error (nunca un resultado parcial)", async () => {
    const failure = new Error("502");
    const fetchPage = async (token: string | undefined) => {
      if (token === "p2") throw failure;
      return { ok: true, events: range(0, 250), nextPageToken: "p2" };
    };
    await expect(fetchAllCalendarEventPages(fetchPage)).rejects.toBe(failure);
  });

  test("un token repetido rechaza en vez de entrar en bucle", async () => {
    let calls = 0;
    const fetchPage = async () => {
      calls += 1;
      return { ok: true, events: range(0, 1), nextPageToken: "same" };
    };
    await expect(fetchAllCalendarEventPages(fetchPage)).rejects.toBeInstanceOf(
      CalendarEventsPaginationError,
    );
    expect(calls).toBe(2);
  });

  test("rebasar el tope de páginas rechaza en vez de truncar", async () => {
    let calls = 0;
    const fetchPage = async () => {
      calls += 1;
      return { ok: true, events: range(0, 1), nextPageToken: `p${calls + 1}` };
    };
    await expect(fetchAllCalendarEventPages(fetchPage, { maxPages: 3 })).rejects.toBeInstanceOf(
      CalendarEventsPaginationError,
    );
    expect(calls).toBe(3);
  });

  test("pasa el signal a cada página y, si se aborta, no pide ninguna más", async () => {
    const controller = new AbortController();
    const seen: Array<AbortSignal | undefined> = [];
    const fetchPage = async (_token: string | undefined, signal?: AbortSignal) => {
      seen.push(signal);
      // La consulta se cancela mientras la primera página está en vuelo.
      if (seen.length === 1) controller.abort();
      return { ok: true, events: range(0, 1), nextPageToken: `p${seen.length + 1}` };
    };
    await expect(
      fetchAllCalendarEventPages(fetchPage, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(seen).toEqual([controller.signal]);
  });

  test("un signal ya abortado no pide ni la primera página", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const fetchPage = async () => {
      calls += 1;
      return { ok: true, events: [] };
    };
    await expect(
      fetchAllCalendarEventPages(fetchPage, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(0);
  });
});
