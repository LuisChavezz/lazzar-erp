import { expect, test } from "@playwright/test";
import { persistSessionEmpresa } from "@/src/features/auth/utils/persistSessionEmpresa";

/**
 * EC-842: un GET de sesión tardío puede revertir la cookie tras `update()`;
 * la escritura se confirma contra la sesión persistida y se reaplica, con tope.
 */

const noWait = async () => {};

const fakeSession = (initial: number | null) => {
  const state = { cookie: initial as number | null | undefined, updates: 0 };
  return {
    state,
    update: async ({ empresa }: { empresa: number | null }) => {
      state.updates += 1;
      state.cookie = empresa;
      return { user: { empresa } };
    },
  };
};

test.describe("persistSessionEmpresa", () => {
  test("confirma a la primera si nada la revierte", async () => {
    const s = fakeSession(1);
    const ok = await persistSessionEmpresa({ empresa: 2, update: s.update, readPersisted: async () => s.state.cookie, wait: noWait });
    expect(ok).toBe(true);
    expect(s.state.updates).toBe(1);
  });

  test("reaplica si un GET tardío revirtió la cookie y luego confirma", async () => {
    const s = fakeSession(1);
    let reverts = 1;
    const readPersisted = async () => {
      if (reverts > 0) {
        reverts -= 1;
        s.state.cookie = 1; // la respuesta del GET viejo reescribe la cookie
      }
      return s.state.cookie;
    };
    const ok = await persistSessionEmpresa({ empresa: 2, update: s.update, readPersisted, wait: noWait });
    expect(ok).toBe(true);
    expect(s.state.updates).toBe(2);
    expect(s.state.cookie).toBe(2);
  });

  test("con reversiones continuas se rinde tras el tope", async () => {
    const s = fakeSession(1);
    const readPersisted = async () => {
      s.state.cookie = 1;
      return s.state.cookie;
    };
    const ok = await persistSessionEmpresa({ empresa: 2, update: s.update, readPersisted, wait: noWait, delays: [1, 1, 1] });
    expect(ok).toBe(false);
    // una escritura inicial + una reaplicación por cada comprobación salvo la última
    expect(s.state.updates).toBe(3);
  });

  test("escribe null explícito y lo confirma", async () => {
    const s = fakeSession(5);
    const ok = await persistSessionEmpresa({ empresa: null, update: s.update, readPersisted: async () => s.state.cookie, wait: noWait });
    expect(ok).toBe(true);
    expect(s.state.cookie).toBeNull();
  });

  test("si update() no devuelve la empresa, falla sin comprobar", async () => {
    let reads = 0;
    const ok = await persistSessionEmpresa({
      empresa: 2,
      update: async () => null,
      readPersisted: async () => { reads += 1; return 2; },
      wait: noWait,
    });
    expect(ok).toBe(false);
    expect(reads).toBe(0);
  });
});
