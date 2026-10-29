import { expect, test } from "@playwright/test";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";

/**
 * Pruebas unitarias de EC-635: la regla genérica con que un diálogo de fila de
 * los catálogos de RH se cierra con aviso cuando su registro cambia por fuera.
 */

const messages = {
  gone: "El área ya no existe. Se actualizó el listado.",
  activoChanged: (activo: boolean) => `El área cambió de estatus: ya está ${activo ? "activa" : "inactiva"}.`,
};

test.describe("getStaleRowDialogNotice", () => {
  test("sin diálogo abierto no hay aviso", () => {
    expect(
      getStaleRowDialogNotice({ resource: "area", targetId: null, target: null, expectedActivo: true, isBusy: false, messages }),
    ).toBeNull();
  });

  test("el registro desaparece del listado: aviso de inexistente con key estable", () => {
    expect(
      getStaleRowDialogNotice({ resource: "area", targetId: 7, target: null, expectedActivo: true, isBusy: false, messages }),
    ).toEqual({ key: "area-stale-7-gone", message: messages.gone });
  });

  test("`activo` cambió por fuera: aviso con el estatus nuevo", () => {
    expect(
      getStaleRowDialogNotice({ resource: "area", targetId: 7, target: { activo: false }, expectedActivo: true, isBusy: false, messages }),
    ).toEqual({ key: "area-stale-7-false", message: "El área cambió de estatus: ya está inactiva." });
  });

  test("`activo` sigue como la acción lo necesita: el diálogo sigue", () => {
    expect(
      getStaleRowDialogNotice({ resource: "area", targetId: 7, target: { activo: true }, expectedActivo: true, isBusy: false, messages }),
    ).toBeNull();
  });

  test("con la acción propia en vuelo no hay aviso, aunque el optimista ya cambió `activo` o quitó la fila", () => {
    expect(
      getStaleRowDialogNotice({ resource: "area", targetId: 7, target: { activo: false }, expectedActivo: true, isBusy: true, messages }),
    ).toBeNull();
    expect(
      getStaleRowDialogNotice({ resource: "calendar", targetId: 7, target: null, isBusy: true, messages: { gone: "x" } }),
    ).toBeNull();
  });

  test("sin `expectedActivo` (catálogo sin baja lógica) solo cuenta que el registro desaparezca", () => {
    const calendarMessages = { gone: "El día ya no existe. Se actualizó el listado." };
    expect(
      getStaleRowDialogNotice({ resource: "calendar", targetId: 3, target: {}, isBusy: false, messages: calendarMessages }),
    ).toBeNull();
    expect(
      getStaleRowDialogNotice({ resource: "calendar", targetId: 3, target: null, isBusy: false, messages: calendarMessages }),
    ).toEqual({ key: "calendar-stale-3-gone", message: calendarMessages.gone });
  });
});

/**
 * EC-636: registros sin `activo` cuyo diálogo depende del `estado` de negocio
 * (aprobar/rechazar, pagar/cancelar, confirmar/devolver).
 */
test.describe("getStaleRowDialogNotice con expectedEstado", () => {
  type Estado = "pendiente" | "aprobado" | "rechazado";
  const estadoMessages = {
    gone: "La solicitud ya no existe. Se actualizó el listado.",
    estadoChanged: (estado: Estado) => `La solicitud cambió de estado: ya está ${estado}.`,
  };

  test("sigue en el estado esperado: el diálogo sigue", () => {
    expect(
      getStaleRowDialogNotice<Estado>({
        resource: "vacation",
        targetId: 4,
        target: { estado: "pendiente" },
        expectedEstado: "pendiente",
        isBusy: false,
        messages: estadoMessages,
      }),
    ).toBeNull();
  });

  test("cambió de estado por fuera: aviso con el estado nuevo y key por estado", () => {
    expect(
      getStaleRowDialogNotice<Estado>({
        resource: "vacation",
        targetId: 4,
        target: { estado: "aprobado" },
        expectedEstado: "pendiente",
        isBusy: false,
        messages: estadoMessages,
      }),
    ).toEqual({ key: "vacation-stale-4-aprobado", message: "La solicitud cambió de estado: ya está aprobado." });
  });

  test("el esperado puede ser cualquiera (el estado con que se abrió la confirmación)", () => {
    expect(
      getStaleRowDialogNotice<Estado>({
        resource: "vacation",
        targetId: 4,
        target: { estado: "aprobado" },
        expectedEstado: "aprobado",
        isBusy: false,
        messages: estadoMessages,
      }),
    ).toBeNull();
    expect(
      getStaleRowDialogNotice<Estado>({
        resource: "vacation",
        targetId: 4,
        target: { estado: "pendiente" },
        expectedEstado: "aprobado",
        isBusy: false,
        messages: estadoMessages,
      }),
    ).toEqual({ key: "vacation-stale-4-pendiente", message: "La solicitud cambió de estado: ya está pendiente." });
  });

  test("desaparece del listado: aviso de inexistente", () => {
    expect(
      getStaleRowDialogNotice<Estado>({
        resource: "vacation",
        targetId: 4,
        target: null,
        expectedEstado: "pendiente",
        isBusy: false,
        messages: estadoMessages,
      }),
    ).toEqual({ key: "vacation-stale-4-gone", message: estadoMessages.gone });
  });

  test("con la acción propia en vuelo no hay aviso aunque el refetch ya muestre el estado nuevo", () => {
    expect(
      getStaleRowDialogNotice<Estado>({
        resource: "vacation",
        targetId: 4,
        target: { estado: "rechazado" },
        expectedEstado: "pendiente",
        isBusy: true,
        messages: estadoMessages,
      }),
    ).toBeNull();
  });
});
