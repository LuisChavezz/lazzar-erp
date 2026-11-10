import { expect, test } from "@playwright/test";
import { observeSessionUser } from "@/src/features/auth/utils/sessionUserSwitch";

/**
 * EC-848: la pestaña solo recarga cuando su sesión pasa de un usuario a otro,
 * nunca en la carga inicial, en una relectura, al perder la sesión ni con el
 * mismo usuario.
 */

/** Aplica una secuencia de ids (como los ve el vigilante) y cuenta las recargas. */
const run = (ids: Array<string | undefined>) => {
  let observed: string | undefined;
  let reloads = 0;
  for (const id of ids) {
    const result = observeSessionUser(observed, id);
    observed = result.observed;
    if (result.reload) reloads += 1;
  }
  return { observed, reloads };
};

test("la carga inicial (loading → A) fija la referencia sin recargar", () => {
  expect(run([undefined, "1"])).toEqual({ observed: "1", reloads: 0 });
});

test("el mismo usuario en relecturas, update() o cambio de empresa no recarga", () => {
  expect(run([undefined, "1", undefined, "1", "1"])).toEqual({ observed: "1", reloads: 0 });
});

test("perder la sesión no recarga ni olvida al usuario", () => {
  expect(run(["1", undefined])).toEqual({ observed: "1", reloads: 0 });
});

test("pasar de A a B recarga", () => {
  expect(run(["1", "2"]).reloads).toBe(1);
});

test("A → sin sesión → B también recarga", () => {
  expect(run(["1", undefined, "2"]).reloads).toBe(1);
});

test("si la recarga no ocurre, la referencia sigue siendo A", () => {
  expect(observeSessionUser("1", "2")).toEqual({ observed: "1", reload: true });
});

test("sin sesión desde el inicio no fija referencia", () => {
  expect(run([undefined, undefined])).toEqual({ observed: undefined, reloads: 0 });
});
