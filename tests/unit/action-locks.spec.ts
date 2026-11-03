import { expect, test } from "@playwright/test";
import {
  acquireRowLock,
  isRowLockHeld,
  releaseRowLock,
  runWithSubmitLock,
} from "@/src/utils/actionLocks";

/**
 * Pruebas unitarias de EC-677 sobre el núcleo de los candados contra el doble
 * envío: el de fila (`useRowActionLock`, `guardClose`) y el del envío de un
 * formulario (`submitLockRef`).
 */

test.describe("candado de fila", () => {
  test("no se toma dos veces el mismo id", () => {
    const held = new Set<number>();
    expect(acquireRowLock(held, 7)).toBe(true);
    expect(acquireRowLock(held, 7)).toBe(false);
    expect(isRowLockHeld(held, 7)).toBe(true);
  });

  test("ids distintos no se bloquean entre sí", () => {
    const held = new Set<number>();
    expect(acquireRowLock(held, 1)).toBe(true);
    expect(acquireRowLock(held, 2)).toBe(true);
    expect(isRowLockHeld(held, 3)).toBe(false);
  });

  test("al soltarlo se puede volver a tomar", () => {
    const held = new Set<number>();
    acquireRowLock(held, 7);
    releaseRowLock(held, 7);
    expect(isRowLockHeld(held, 7)).toBe(false);
    expect(acquireRowLock(held, 7)).toBe(true);
  });

  test("sin registro (`null`) nunca está tomado", () => {
    const held = new Set<number>([0]);
    expect(isRowLockHeld(held, null)).toBe(false);
  });
});

test.describe("candado de envío", () => {
  test("se toma ANTES de que corra el envío", async () => {
    const lock = { current: false };
    let heldDuringSubmit = false;
    await runWithSubmitLock(lock, async () => {
      heldDuringSubmit = lock.current;
    });
    expect(heldDuringSubmit).toBe(true);
  });

  test("un segundo envío con el primero en vuelo no corre", async () => {
    const lock = { current: false };
    let calls = 0;
    let finish: () => void = () => {};
    const first = runWithSubmitLock(lock, () => {
      calls += 1;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    const second = runWithSubmitLock(lock, async () => {
      calls += 1;
    });
    expect(second).toBeNull();
    expect(calls).toBe(1);
    expect(lock.current).toBe(true);
    finish();
    await first;
    expect(lock.current).toBe(false);
  });

  test("se suelta tras una validación fallida y el formulario puede volver a enviarse", async () => {
    const lock = { current: false };
    // TanStack Form resuelve `handleSubmit` sin llamar a `onSubmit` cuando la
    // validación falla: no hay petición, pero el candado debe soltarse.
    await runWithSubmitLock(lock, async () => undefined);
    expect(lock.current).toBe(false);
    let resubmitted = false;
    await runWithSubmitLock(lock, async () => {
      resubmitted = true;
    });
    expect(resubmitted).toBe(true);
  });

  test("se suelta aunque el envío rechace, y el rechazo no escapa", async () => {
    const lock = { current: false };
    await expect(
      runWithSubmitLock(lock, async () => {
        throw new Error("falló");
      }),
    ).resolves.toBeUndefined();
    expect(lock.current).toBe(false);
  });
});
