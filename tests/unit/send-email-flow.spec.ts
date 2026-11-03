import { expect, test } from "@playwright/test";
import {
  assertEmailSnapshotUnchanged,
  createSendEmailFlow,
} from "@/src/features/google/utils/sendEmailFlow";
import { isSameSnapshot } from "@/src/utils/sameSnapshot";

/**
 * Pruebas unitarias de EC-700: la orquestación de "preparar → confirmar →
 * enviar" que comparten cotizaciones, facturas y órdenes de compra
 * (`createSendEmailFlow`, la parte sin React de `useSendEmailConfirmation`) y
 * la revalidación al enviar (`assertEmailSnapshotUnchanged`). Corren con
 * `npm run test:unit`.
 */

type Email = { id: number; subject: string };

/** Promesa que se resuelve o rechaza desde fuera, para ordenar las llegadas. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Flujo con dependencias falsas que registran todo lo que pasa. */
const setup = (prepare: (id: number) => Promise<Email>) => {
  const log = {
    busy: new Set<number>(),
    sending: new Set<Email>(),
    expectedId: undefined as number | undefined,
    prepared: [] as Email[],
    sent: [] as Email[],
    busyNotices: 0,
    prepareCalls: [] as number[],
  };
  const flow = createSendEmailFlow<Email>({
    turn: { current: 0 },
    isBusy: (id) => log.busy.has(id),
    isSending: (email) => log.sending.has(email),
    getExpectedId: () => log.expectedId,
    prepare: (id) => {
      log.prepareCalls.push(id);
      return prepare(id);
    },
    send: (email) => log.sent.push(email),
    onPrepared: (email) => log.prepared.push(email),
    onBusy: () => log.busyNotices++,
  });
  return { flow, log };
};

test("preparar abre la confirmación y no envía nada (cancelar = no confirmar)", async () => {
  const { flow, log } = setup(async (id) => ({ id, subject: "Factura" }));

  await flow.request(7);

  expect(log.prepared).toEqual([{ id: 7, subject: "Factura" }]);
  expect(log.sent).toEqual([]);
});

test("confirmar envía exactamente una vez el correo preparado", async () => {
  const { flow, log } = setup(async (id) => ({ id, subject: "Factura" }));
  await flow.request(7);

  flow.confirm(log.prepared[0]);

  expect(log.sent).toEqual([{ id: 7, subject: "Factura" }]);
});

test("con el registro ocupado no se prepara otra vez (doble clic)", async () => {
  const { flow, log } = setup(async (id) => ({ id, subject: "x" }));
  log.busy.add(7);

  await flow.request(7);

  expect(log.prepareCalls).toEqual([]);
  expect(log.prepared).toEqual([]);
});

test("confirmar otra vez el correo que ya se está enviando no hace nada ni avisa", () => {
  const { flow, log } = setup(async (id) => ({ id, subject: "x" }));
  const email = { id: 7, subject: "x" };
  // La mutación de envío de ESTE correo está en curso (doble clic en Enviar):
  // el registro aparece ocupado, pero no es "otra acción".
  log.sending.add(email);
  log.busy.add(7);

  flow.confirm(email);

  expect(log.sent).toEqual([]);
  expect(log.busyNotices).toBe(0);
});

test("no abre la confirmación si la vista pasó a otro registro mientras se preparaba", async () => {
  const pending = deferred<Email>();
  const { flow, log } = setup(() => pending.promise);
  log.expectedId = 493;

  const request = flow.request(493);
  log.expectedId = 492;
  pending.resolve({ id: 493, subject: "F-00097" });
  await request;

  expect(log.prepared).toEqual([]);
});

test("sí abre la confirmación si la vista sigue en el mismo registro", async () => {
  const { flow, log } = setup(async (id) => ({ id, subject: "F-00097" }));
  log.expectedId = 493;

  await flow.request(493);

  expect(log.prepared).toEqual([{ id: 493, subject: "F-00097" }]);
});

test("confirmar con el registro ocupado avisa y no envía", () => {
  const { flow, log } = setup(async (id) => ({ id, subject: "x" }));
  log.busy.add(7);

  flow.confirm({ id: 7, subject: "x" });

  expect(log.sent).toEqual([]);
  expect(log.busyNotices).toBe(1);
});

test("solo abre la confirmación del ÚLTIMO pedido, aunque el primero llegue después", async () => {
  const first = deferred<Email>();
  const second = deferred<Email>();
  const { flow, log } = setup((id) => (id === 1 ? first.promise : second.promise));

  const a = flow.request(1);
  const b = flow.request(2);
  second.resolve({ id: 2, subject: "segunda" });
  await b;
  first.resolve({ id: 1, subject: "primera" });
  await a;

  expect(log.prepared).toEqual([{ id: 2, subject: "segunda" }]);
});

test("invalidar descarta lo que se estaba preparando", async () => {
  const pending = deferred<Email>();
  const { flow, log } = setup(() => pending.promise);

  const request = flow.request(3);
  flow.invalidate();
  pending.resolve({ id: 3, subject: "x" });
  await request;

  expect(log.prepared).toEqual([]);
});

test("no abre la confirmación si lo preparado es de otro registro", async () => {
  const { flow, log } = setup(async () => ({ id: 99, subject: "otro" }));

  await flow.request(3);

  expect(log.prepared).toEqual([]);
});

test("si preparar falla no abre nada ni lanza (el aviso es de su mutación)", async () => {
  const { flow, log } = setup(() => Promise.reject(new Error("422")));

  await expect(flow.request(3)).resolves.toBeUndefined();
  expect(log.prepared).toEqual([]);
});

test("revalidar al enviar: un registro igual deja enviar", () => {
  const prepared = { id: 1, estatus: "Emitida", detalles: [{ talla: "M", cantidad: "2.00" }] };
  // Misma lectura con las llaves en otro orden.
  const current = { detalles: [{ cantidad: "2.00", talla: "M" }], estatus: "Emitida", id: 1 };

  expect(() => assertEmailSnapshotUnchanged(current, prepared, "cambió")).not.toThrow();
});

test("revalidar al enviar: cualquier cambio aborta con el mensaje del dominio", () => {
  const prepared = { id: 1, estatus: "Emitida", detalles: [{ talla: "M", cantidad: "2.00" }] };

  for (const current of [
    { ...prepared, estatus: "Cancelada" },
    { ...prepared, detalles: [{ talla: "M", cantidad: "3.00" }] },
    { ...prepared, detalles: [...prepared.detalles, { talla: "L", cantidad: "1.00" }] },
    { ...prepared, correo_facturas: "nuevo@x.com" },
  ]) {
    expect(() => assertEmailSnapshotUnchanged(current, prepared, "cambió")).toThrow("cambió");
  }
});

test("isSameSnapshot distingue null, ausencia, arreglos y tipos", () => {
  expect(isSameSnapshot({ a: null }, { a: null })).toBe(true);
  expect(isSameSnapshot({ a: null }, {})).toBe(false);
  expect(isSameSnapshot({ a: undefined }, {})).toBe(false);
  expect(isSameSnapshot([1, 2], [2, 1])).toBe(false);
  expect(isSameSnapshot({ 0: "a" }, ["a"])).toBe(false);
  expect(isSameSnapshot("1", 1)).toBe(false);
  expect(isSameSnapshot({ n: { m: [1, { x: "y" }] } }, { n: { m: [1, { x: "y" }] } })).toBe(true);
});
