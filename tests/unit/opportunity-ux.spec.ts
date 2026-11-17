import { expect, test } from "@playwright/test";
import {
  ESTADO_OPORTUNIDAD_CFG,
  ESTADO_OPORTUNIDAD_VALUES,
} from "@/src/features/opportunities/constants/opportunityChoices";
import type { Opportunity } from "@/src/features/opportunities/interfaces/opportunity.interface";
import { describeOpportunity } from "@/src/features/opportunities/utils/describeOpportunity";
import {
  getOpportunityClienteContacto,
  getOpportunityClienteLabel,
} from "@/src/features/opportunities/utils/opportunityClienteLabel";
import {
  OPPORTUNITY_ESTADO_FILTER_OPTIONS,
  buildOpportunityClienteFilterOptions,
} from "@/src/features/opportunities/utils/opportunityFilterOptions";
import {
  OPPORTUNITY_STALE_GONE_MESSAGE,
  getOpportunityStaleNotice,
  resolveLiveOpportunity,
  INITIAL_STALE_NOTICE_MEMORY,
  getStaleNoticeForFrame,
  nextStaleNoticeMemory,
  type LiveOpportunitySources,
  type LiveOpportunityView,
  type StaleNoticeFrame,
  type StaleNoticeMemory,
} from "@/src/features/opportunities/utils/opportunityLiveState";
import { acquireRowLock, releaseRowLock, runWithSubmitLock } from "@/src/utils/actionLocks";

/** Oportunidades (EC-756): opciones de estado, nombre del cliente, aviso de fila obsoleta y candados. */

const opportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: 7,
  cliente: 21,
  cliente_nombre: "JUAN PÉREZ",
  cliente_razon_social: "ABARROTES ABEJA, SA DE CV",
  vendedor: 3,
  vendedor_nombre: "Ana",
  nombre_contacto: "",
  telefono: "",
  correo: "",
  titulo: "",
  monto_estimado: "0.00",
  etapa: "Nueva",
  estado: "Nueva",
  motivo_perdida: "",
  proximo_contacto: null,
  notas: "",
  created_at: null,
  updated_at: null,
  ...overrides,
});

test.describe("opciones del filtro de estado", () => {
  test("Todos y luego el enum completo del backend, en orden, con su etiqueta y su punto", () => {
    const [todos, ...estados] = OPPORTUNITY_ESTADO_FILTER_OPTIONS;
    expect(todos).toEqual({ value: undefined, label: "Todos" });
    expect(estados.map((option) => option.value)).toEqual([...ESTADO_OPORTUNIDAD_VALUES]);
    expect(estados).toContainEqual({
      value: "Ganada",
      label: "Ganada",
      dotClassName: ESTADO_OPORTUNIDAD_CFG.Ganada.dot,
    });
  });
});

test.describe("nombre del cliente (EC-810)", () => {
  test("la razón social tal cual, sin cambiarle mayúsculas", () => {
    expect(getOpportunityClienteLabel(opportunity())).toBe("ABARROTES ABEJA, SA DE CV");
  });

  test("razón social en blanco: el nombre del cliente", () => {
    expect(getOpportunityClienteLabel(opportunity({ cliente_razon_social: "  " }))).toBe("JUAN PÉREZ");
  });

  test("cliente oculto (los dos nombres en null): Cliente #id", () => {
    const hidden = opportunity({ cliente_nombre: null, cliente_razon_social: null });
    expect(getOpportunityClienteLabel(hidden)).toBe("Cliente #21");
    expect(getOpportunityClienteContacto(hidden)).toBeNull();
  });

  test("sin cliente: null, y cada pantalla decide", () => {
    expect(
      getOpportunityClienteLabel(
        opportunity({ cliente: null, cliente_nombre: null, cliente_razon_social: null })
      )
    ).toBeNull();
  });

  test("el contacto del cliente solo cuando aporta algo", () => {
    expect(getOpportunityClienteContacto(opportunity())).toBe("JUAN PÉREZ");
    expect(
      getOpportunityClienteContacto(opportunity({ cliente_nombre: "abarrotes abeja, sa de cv" }))
    ).toBeNull();
    expect(getOpportunityClienteContacto(opportunity({ cliente_razon_social: "" }))).toBeNull();
  });

  test("una oportunidad sin título se nombra por la razón social; con el cliente oculto, por su contacto", () => {
    expect(describeOpportunity(opportunity())).toBe("de ABARROTES ABEJA, SA DE CV");
    expect(
      describeOpportunity(
        opportunity({ cliente_nombre: null, cliente_razon_social: null, nombre_contacto: "LUIS" })
      )
    ).toBe("de LUIS");
  });

  test("opciones del filtro de cliente con la misma etiqueta y los homónimos distinguidos por id", () => {
    const options = buildOpportunityClienteFilterOptions([
      { id: "21", razon_social: "LAZZAR", nombre: "A", activo: true },
      { id: "22", razon_social: "LAZZAR", nombre: "B", activo: true },
      { id: 23, razon_social: "", nombre: "SOLO NOMBRE", activo: true },
      { id: 24, razon_social: "", nombre: "", activo: false },
    ]);
    expect(options).toEqual([
      { value: undefined, label: "Todos" },
      { value: "21", label: "LAZZAR (cliente #21)" },
      { value: "22", label: "LAZZAR (cliente #22)" },
      { value: "23", label: "SOLO NOMBRE" },
      { value: "24", label: "Cliente #24 (inactivo)" },
    ]);
  });
});

/** Lo que el aviso mira de una lectura (registro o detalle). */
const detail = (
  estado: Opportunity["estado"],
  cotizaciones?: { id: number; estatus: number }[]
): LiveOpportunityView => ({ estado, cotizaciones });

const baseline = { dataUpdateCount: 2, errorUpdateCount: 1 };

type State = NonNullable<LiveOpportunitySources<LiveOpportunityView>["state"]>;

const state = (overrides: Partial<State>): State => ({
  ...baseline,
  dataUpdatedAt: 100,
  errorUpdatedAt: 50,
  data: detail("Nueva"),
  isNotFound: false,
  ...overrides,
});

test.describe("estado vivo de la oportunidad", () => {
  test("lo que ya estaba en caché al abrir no cuenta", () => {
    expect(resolveLiveOpportunity({ baseline, state: state({}) })).toBeUndefined();
    expect(
      resolveLiveOpportunity({ baseline, state: state({ isNotFound: true, errorUpdatedAt: 200 }) })
    ).toBeUndefined();
  });

  test("un detalle leído después de abrir es el estado vivo", () => {
    const fresh = detail("Ganada");
    expect(resolveLiveOpportunity({ baseline, state: state({ dataUpdateCount: 3, data: fresh }) })).toBe(fresh);
  });

  test("un 404 después de abrir: ya no existe", () => {
    expect(
      resolveLiveOpportunity({
        baseline,
        state: state({ errorUpdateCount: 2, errorUpdatedAt: 200, isNotFound: true }),
      })
    ).toBeNull();
  });

  test("un error que no es 404 no dice nada", () => {
    expect(
      resolveLiveOpportunity({ baseline, state: state({ errorUpdateCount: 2, errorUpdatedAt: 200 }) })
    ).toBeUndefined();
  });

  test("si llegaron un 404 y luego datos, mandan los datos", () => {
    const fresh = detail("Nueva");
    expect(
      resolveLiveOpportunity({
        baseline,
        state: state({
          errorUpdateCount: 2,
          errorUpdatedAt: 150,
          isNotFound: true,
          dataUpdateCount: 3,
          dataUpdatedAt: 300,
          data: fresh,
        }),
      })
    ).toBe(fresh);
  });
});

test.describe("aviso de fila obsoleta", () => {
  const notice = (
    action: Parameters<typeof getOpportunityStaleNotice>[0]["action"],
    live: Parameters<typeof getOpportunityStaleNotice>[0]["live"],
    isBusy = false
  ) => getOpportunityStaleNotice({ action, opportunityId: 7, live, isBusy });

  test("sin nada nuevo del detalle, ningún diálogo se cierra", () => {
    for (const action of [
      { kind: "delete" as const },
      { kind: "transfer" as const },
      { kind: "ligar" as const },
      { kind: "quitar" as const, cotizacionId: 5 },
    ]) {
      expect(notice(action, undefined)).toBeNull();
    }
  });

  test("ya no existe (404): se cierran todos con el mismo aviso", () => {
    expect(notice({ kind: "delete" }, null)?.message).toBe(OPPORTUNITY_STALE_GONE_MESSAGE);
    expect(notice({ kind: "transfer" }, null)?.message).toBe(OPPORTUNITY_STALE_GONE_MESSAGE);
    expect(notice({ kind: "ligar" }, null)?.message).toBe(OPPORTUNITY_STALE_GONE_MESSAGE);
    expect(notice({ kind: "quitar", cotizacionId: 5 }, null)?.message).toBe(
      OPPORTUNITY_STALE_GONE_MESSAGE
    );
  });

  test("mientras la acción propia viaja no se avisa", () => {
    expect(notice({ kind: "delete" }, null, true)).toBeNull();
  });

  test("cerrada: Ligar se cierra; Dar de baja y Transferir siguen", () => {
    expect(notice({ kind: "ligar" }, detail("Perdida"))?.message).toBe(
      "La oportunidad ya está perdida: ya no se le pueden ligar cotizaciones."
    );
    expect(notice({ kind: "ligar" }, detail("Cotizada"))).toBeNull();
    expect(notice({ kind: "delete" }, detail("Ganada"))).toBeNull();
    expect(notice({ kind: "transfer" }, detail("Ganada"))).toBeNull();
  });

  test("Quitar: la cotización ya no está ligada o ya se autorizó", () => {
    const quitar = { kind: "quitar" as const, cotizacionId: 5 };
    expect(notice(quitar, detail("Cotizada", [{ id: 5, estatus: 1 }]))).toBeNull();
    // Sin el arreglo (el detalle se defiende de ese caso con `?? []`) no se sabe:
    // sigue ligada y el diálogo no se cierra.
    expect(notice(quitar, detail("Cotizada"))).toBeNull();
    expect(notice(quitar, detail("Cotizada", [{ id: 6, estatus: 1 }]))?.message).toBe(
      "La cotización #5 ya no está ligada a esta oportunidad."
    );
    expect(notice(quitar, detail("Ganada", [{ id: 5, estatus: 3 }]))?.message).toBe(
      "La cotización #5 ya está autorizada: no se puede quitar de la oportunidad."
    );
  });
});

/**
 * `useOpportunityStaleNotice` render a render: cada cuadro pasa por
 * `nextStaleNoticeMemory` y `getStaleNoticeForFrame`, las mismas funciones que
 * usa el hook. Devuelve el aviso de cada render.
 */
const runFrames = (
  frames: StaleNoticeFrame<LiveOpportunityView>[],
  action: Parameters<typeof getStaleNoticeForFrame>[0]["action"] = { kind: "transfer" }
) => {
  let memory: StaleNoticeMemory = INITIAL_STALE_NOTICE_MEMORY;
  return frames.map((frame) => {
    memory = nextStaleNoticeMemory(memory, frame);
    return getStaleNoticeForFrame({
      frame,
      memory,
      action,
      opportunityId: frame.open ? 7 : null,
      toView: (data) => data,
    })?.message ?? null;
  });
};

const counts = (dataUpdateCount: number, errorUpdateCount: number, extra: Partial<State> = {}) =>
  state({ dataUpdateCount, errorUpdateCount, ...extra });

test.describe("aviso de fila obsoleta render a render", () => {
  test("los contadores se toman AL ABRIR: un 404 en caché de antes no avisa, uno nuevo sí", () => {
    const gone404 = { isNotFound: true, errorUpdatedAt: 500 };
    expect(
      runFrames([
        { open: false, isBusy: false, state: counts(2, 1, gone404) },
        // Abre con el 404 viejo en caché: no cuenta.
        { open: true, isBusy: false, state: counts(2, 1, gone404) },
        // Llega un 404 nuevo tras abrir.
        { open: true, isBusy: false, state: counts(2, 2, { ...gone404, errorUpdatedAt: 900 }) },
      ])
    ).toEqual([null, null, OPPORTUNITY_STALE_GONE_MESSAGE]);
  });

  test("la base se copia en la transición a abierto y no se mueve después", () => {
    const opening = nextStaleNoticeMemory(INITIAL_STALE_NOTICE_MEMORY, {
      open: true,
      isBusy: false,
      state: counts(4, 3),
    });
    expect(opening.baseline).toEqual({ dataUpdateCount: 4, errorUpdateCount: 3 });
    // Los renders siguientes no la mueven (misma referencia).
    expect(nextStaleNoticeMemory(opening, { open: true, isBusy: false, state: counts(5, 9) })).toBe(opening);
  });

  test("con el candado tomado no avisa, aunque la mutación ya no esté pendiente", () => {
    // Transferir falla con 404: el hook avisa y la relectura trae el 404. La
    // mutación deja de estar pendiente un render antes de que el diálogo se
    // cierre, pero el candado (parte de `isBusy`) sigue tomado hasta entonces.
    const gone = counts(2, 2, { isNotFound: true, errorUpdatedAt: 900 });
    expect(
      runFrames([
        { open: true, isBusy: false, state: counts(2, 1) },
        { open: true, isBusy: true, state: gone },
        // El diálogo se cierra con el candado aún tomado: ningún aviso propio.
        { open: false, isBusy: false, state: gone },
      ])
    ).toEqual([null, null, null]);
  });

  test("un 404 da UN solo aviso: la misma llave en cada render hasta cerrar", () => {
    const gone = counts(2, 2, { isNotFound: true, errorUpdatedAt: 900 });
    let memory: StaleNoticeMemory = INITIAL_STALE_NOTICE_MEMORY;
    const keys = [
      { open: true, isBusy: false, state: counts(2, 1) },
      { open: true, isBusy: false, state: gone },
      { open: true, isBusy: false, state: gone },
      { open: false, isBusy: false, state: gone },
    ].map((frame) => {
      memory = nextStaleNoticeMemory(memory, frame);
      return getStaleNoticeForFrame({
        frame,
        memory,
        action: { kind: "delete" },
        opportunityId: frame.open ? 7 : null,
        toView: (data: LiveOpportunityView) => data,
      })?.key;
    });
    // El efecto del hook dispara el toast por llave (y el toast usa la llave
    // como `id`): dos renders con la misma llave son un solo aviso.
    expect(keys).toEqual([undefined, "opportunity-delete-stale-7-gone", "opportunity-delete-stale-7-gone", undefined]);
  });

  test("al reabrir se toman contadores nuevos: lo de la apertura anterior no cuenta", () => {
    const gone = counts(2, 2, { isNotFound: true, errorUpdatedAt: 900 });
    expect(
      runFrames([
        { open: true, isBusy: false, state: counts(2, 1) },
        { open: false, isBusy: false, state: gone },
        { open: true, isBusy: false, state: gone },
      ])
    ).toEqual([null, null, null]);
  });
});

test.describe("candados de las acciones", () => {
  test("Transferir y Ligar: dos envíos en el mismo tick mandan una sola petición", async () => {
    const lock = { current: false };
    let calls = 0;
    let resolve!: () => void;
    const submit = () => {
      calls += 1;
      return new Promise<void>((done) => {
        resolve = done;
      });
    };
    const first = runWithSubmitLock(lock, submit);
    const second = runWithSubmitLock(lock, submit);
    expect(second).toBeNull();
    expect(calls).toBe(1);
    resolve();
    await first;
    // Al terminar (bien o mal) se puede volver a enviar.
    expect(lock.current).toBe(false);
  });

  test("Dar de baja y Quitar: el candado es por registro", () => {
    const held = new Set<number>();
    expect(acquireRowLock(held, 7)).toBe(true);
    expect(acquireRowLock(held, 7)).toBe(false);
    expect(acquireRowLock(held, 8)).toBe(true);
    releaseRowLock(held, 7);
    expect(acquireRowLock(held, 7)).toBe(true);
  });
});
