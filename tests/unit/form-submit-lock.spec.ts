import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { FormApi } from "@tanstack/react-form";
import {
  useFormSubmitLock,
  type FormSubmitLockOptions,
} from "@/src/hooks/useFormSubmitLock";

/**
 * EC-753: `useFormSubmitLock`, el candado de envío de los formularios de
 * cotización y de Mesa de Control. Se renderiza el hook de verdad (sin DOM:
 * `renderToString` ejecuta su cuerpo una vez) y se usan las funciones que
 * devuelve; los refs del hook persisten en esas funciones.
 *
 * El `baseStore` es el de un `FormApi` REAL, pero `handleSubmit` es un doble
 * que solo cuenta llamadas: TanStack Form (1.28.5) ya ignora un segundo
 * `handleSubmit` mientras `isSubmitting` (`canSubmit` falso), así que con el
 * real estos tests pasarían también SIN el candado y no probarían nada de él.
 */

/** Promesa que el test resuelve a mano, para dejar un envío "en vuelo". */
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

/** Deja correr las microtareas del envío (validación asíncrona incluida). */
const flush = () => new Promise((r) => setTimeout(r, 0));

const renderLock = (options?: FormSubmitLockOptions) => {
  let inFlight = deferred();
  let submits = 0;
  const realForm = new FormApi({ defaultValues: { nombre: "" } });
  const form = {
    baseStore: realForm.baseStore,
    handleSubmit: async () => {
      submits += 1;
      await inFlight.promise;
    },
  };
  type LockApi = ReturnType<typeof useFormSubmitLock>;
  let api!: LockApi;
  // El resultado sale por una prop (no reasignando una variable externa en el
  // render, que `react-hooks/globals` prohíbe).
  const Probe = ({ onRender }: { onRender: (result: LockApi) => void }) => {
    onRender(useFormSubmitLock(form, options));
    return null;
  };
  renderToString(
    createElement(Probe, {
      onRender: (result) => {
        api = result;
      },
    }),
  );
  return {
    api,
    submits: () => submits,
    finish: async () => {
      inFlight.resolve();
      await flush();
      inFlight = deferred();
    },
  };
};

const fakeEvent = () => {
  const calls = { preventDefault: 0, stopPropagation: 0 };
  return {
    calls,
    event: {
      preventDefault: () => {
        calls.preventDefault += 1;
      },
      stopPropagation: () => {
        calls.stopPropagation += 1;
      },
    },
  };
};

test.describe("useFormSubmitLock", () => {
  test("envíos simultáneos (Enter + clic en el mismo tick) corren una sola vez", async () => {
    const lock = renderLock();
    const { event, calls } = fakeEvent();
    lock.api.handleFormSubmit(event);
    lock.api.handleFormSubmit(event);
    lock.api.handleFormSubmit(event);
    await flush();
    expect(lock.submits()).toBe(1);
    // El evento nativo se cancela siempre, aunque el disparo se ignore.
    expect(calls.preventDefault).toBe(3);
    expect(calls.stopPropagation).toBe(3);

    // Al terminar se suelta y el formulario puede volver a enviarse.
    await lock.finish();
    lock.api.handleFormSubmit();
    await flush();
    expect(lock.submits()).toBe(2);
    await lock.finish();
  });

  test("el reinicio se ignora mientras el envío está en vuelo", async () => {
    const lock = renderLock();
    expect(lock.api.isSubmitLocked()).toBe(false);
    lock.api.handleFormSubmit();
    expect(lock.api.isSubmitLocked()).toBe(true);
    await lock.finish();
    expect(lock.api.isSubmitLocked()).toBe(false);
  });

  test("con la salida marcada no se envía nada ni se reinicia", async () => {
    const leavingRef = { current: false };
    const lock = renderLock({ leavingRef });
    lock.api.handleFormSubmit();
    await flush();
    expect(lock.submits()).toBe(1);
    // Guardado correcto: `onSubmit` marca la salida antes de soltar el candado.
    leavingRef.current = true;
    await lock.finish();

    lock.api.handleFormSubmit();
    lock.api.handleFormSubmit();
    await flush();
    expect(lock.submits()).toBe(1);
    expect(lock.api.isSubmitLocked()).toBe(true);
  });

  test("isFormSubmitting sale del store del formulario", () => {
    expect(renderLock().api.isFormSubmitting).toBe(false);
  });
});

test.describe("formularios que usan useFormSubmitLock", () => {
  const HOOKS = [
    "src/features/quotes/hooks/useQuoteForm.ts",
    "src/features/quotes/hooks/useQuoteEditForm.ts",
    "src/features/orders/hooks/usePedidoMesaControlEditForm.ts",
  ];

  for (const file of HOOKS) {
    test(`${path.basename(file)} envía, reinicia y marca la salida con el hook compartido`, () => {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("useFormSubmitLock(form, {");
      expect(source).toContain("leavingRef.current = true;");
      expect(source).toContain("if (isSubmitLocked()) return;");
      // Nada de candados propios: ni el `useState` de antes ni otro `runWithSubmitLock`.
      expect(source).not.toMatch(/isSubmittingForm|runWithSubmitLock\(/);
    });
  }
});
