import { expect, test } from "@playwright/test";
import {
  resolveNotificationIconVariant,
  resolveNotificationTarget,
} from "@/src/features/notifications/constants/notificationTargets";
import {
  TIPO_OC_AUTORIZADA,
  TIPO_PERMISO_AUSENCIA_APROBADO,
  TIPO_PERMISO_AUSENCIA_RECHAZADO,
  TIPO_PERMISO_AUSENCIA_SOLICITADA,
  TIPO_PRE_ORDEN_OC_AUTORIZADA,
  TIPO_VACACIONES_APROBADO,
  TIPO_VACACIONES_RECHAZADO,
  TIPO_VACACIONES_SOLICITADA,
  type Notificacion,
} from "@/src/features/notifications/interfaces/notification.interface";

/**
 * Destinos e iconos de los `tipo` de Compras, RH y pre-órdenes (EC-935).
 * Corren con `npm run test:unit`.
 */

const notificacion = (tipo: string, modulo: string, data: unknown): Notificacion => ({
  id: 1,
  titulo: "Aviso",
  mensaje: "Mensaje",
  modulo,
  tipo,
  leido: false,
  leido_at: null,
  data,
  created_at: "2026-11-23T12:00:00-06:00",
});

const ADMIN = { role: "admin", permissions: [] };
const ALMACEN = { role: "user", permissions: ["R-WMS", "R-WMS-RECEPCIONES"] };
const RH = { role: "user", permissions: ["R-RH"] };
const SIN_PERMISOS = { role: "user", permissions: [] };

/** Ids que nunca deben producir un destino. */
const INVALID_IDS: unknown[] = [undefined, null, "12", 0, -3, 1.5, Number.NaN];

const ocAutorizada = (orden_compra_id: unknown) =>
  notificacion(TIPO_OC_AUTORIZADA, "compras", {
    orden_compra_id,
    folio: "OC-12",
    proveedor_nombre: "Proveedor",
    sucursal_id: 3,
    fecha_entrega_estimada: "2026-12-01",
    url: `/compras/ordenes/${String(orden_compra_id)}`,
  });

const solicitudRh = (tipo: string, solicitud_id: unknown, extra: Record<string, unknown> = {}) =>
  notificacion(tipo, "rh", {
    solicitud_id,
    tipo_solicitud: tipo.startsWith("vacaciones") ? "vacaciones" : "permiso_ausencia",
    empleado_id: 9,
    empleado_nombre: "Ana López",
    fecha_inicio: "2026-12-01",
    fecha_fin: "2026-12-03",
    url: `/rh/vacaciones/${String(solicitud_id)}`,
    ...extra,
  });

test.describe("oc_autorizada", () => {
  test("abre el listado de Recepciones de WMS, sin preselección", () => {
    const target = { kind: "route", href: "/wms/receipts", pathname: "/wms/receipts" };
    expect(resolveNotificationTarget(ocAutorizada(12), ALMACEN)).toEqual(target);
    expect(resolveNotificationTarget(ocAutorizada(12), ADMIN)).toEqual(target);
  });

  test("sin R-WMS-RECEPCIONES no es clicable", () => {
    expect(resolveNotificationTarget(ocAutorizada(12), { role: "user", permissions: ["R-WMS"] })).toBeNull();
    expect(resolveNotificationTarget(ocAutorizada(12), SIN_PERMISOS)).toBeNull();
  });

  test("sin orden_compra_id válido no hay destino", () => {
    for (const id of INVALID_IDS) {
      expect(resolveNotificationTarget(ocAutorizada(id), ADMIN)).toBeNull();
    }
    expect(resolveNotificationTarget(notificacion(TIPO_OC_AUTORIZADA, "compras", null), ADMIN)).toBeNull();
  });

  test("nunca navega al data.url del backend", () => {
    const target = resolveNotificationTarget(ocAutorizada(12), ADMIN);
    expect(target?.kind === "route" ? target.href : null).not.toContain("/compras/");
  });
});

test.describe("solicitudes de RH", () => {
  const VACACIONES = [TIPO_VACACIONES_SOLICITADA, TIPO_VACACIONES_APROBADO, TIPO_VACACIONES_RECHAZADO];
  const PERMISOS = [
    TIPO_PERMISO_AUSENCIA_SOLICITADA,
    TIPO_PERMISO_AUSENCIA_APROBADO,
    TIPO_PERMISO_AUSENCIA_RECHAZADO,
  ];

  test("vacaciones_* abre /hr/vacations con ?solicitud=", () => {
    for (const tipo of VACACIONES) {
      expect(resolveNotificationTarget(solicitudRh(tipo, 42), RH)).toEqual({
        kind: "route",
        href: "/hr/vacations?solicitud=42",
        pathname: "/hr/vacations",
      });
    }
  });

  test("permiso_ausencia_* abre /hr/absences con ?solicitud=", () => {
    for (const tipo of PERMISOS) {
      expect(resolveNotificationTarget(solicitudRh(tipo, 7), RH)).toEqual({
        kind: "route",
        href: "/hr/absences?solicitud=7",
        pathname: "/hr/absences",
      });
    }
  });

  test("el rechazo con motivo_rechazo navega igual", () => {
    const rechazo = solicitudRh(TIPO_VACACIONES_RECHAZADO, 42, { estado: "rechazado", motivo_rechazo: "Cierre" });
    expect(resolveNotificationTarget(rechazo, RH)).toMatchObject({ href: "/hr/vacations?solicitud=42" });
  });

  test("sin R-RH no es clicable", () => {
    for (const tipo of [...VACACIONES, ...PERMISOS]) {
      expect(resolveNotificationTarget(solicitudRh(tipo, 42), SIN_PERMISOS)).toBeNull();
      expect(resolveNotificationTarget(solicitudRh(tipo, 42), ALMACEN)).toBeNull();
    }
  });

  test("sin solicitud_id válido no hay destino", () => {
    for (const tipo of [...VACACIONES, ...PERMISOS]) {
      for (const id of INVALID_IDS) {
        expect(resolveNotificationTarget(solicitudRh(tipo, id), ADMIN)).toBeNull();
      }
      expect(resolveNotificationTarget(notificacion(tipo, "rh", null), ADMIN)).toBeNull();
    }
  });
});

test.describe("pre_orden_oc_autorizada", () => {
  test("entra por el prefijo pre_orden_ y abre la pre-orden de data.pre_orden", () => {
    const aviso = notificacion(TIPO_PRE_ORDEN_OC_AUTORIZADA, "produccion", {
      pre_orden: 13,
      pedido: 88,
      origen: "pedido",
      url: "/produccion/pre-ordenes/13",
    });
    // Pre-órdenes piden C-PRODUCCION-OP (quien crea OP).
    expect(
      resolveNotificationTarget(aviso, { role: "user", permissions: ["R-PRODUCCION", "C-PRODUCCION-OP"] }),
    ).toEqual({
      kind: "route",
      href: "/manufacturing/pre-orders/13",
      pathname: "/manufacturing/pre-orders/13",
    });
    expect(resolveNotificationTarget(aviso, SIN_PERMISOS)).toBeNull();
  });

  test("sin pre_orden ni url válida no hay destino", () => {
    const aviso = notificacion(TIPO_PRE_ORDEN_OC_AUTORIZADA, "produccion", { pre_orden: "13", url: "/x" });
    expect(resolveNotificationTarget(aviso, ADMIN)).toBeNull();
  });
});

test("iconos de los tipos nuevos", () => {
  expect(resolveNotificationIconVariant(TIPO_VACACIONES_APROBADO)).toBe("success");
  expect(resolveNotificationIconVariant(TIPO_PERMISO_AUSENCIA_APROBADO)).toBe("success");
  expect(resolveNotificationIconVariant(TIPO_PRE_ORDEN_OC_AUTORIZADA)).toBe("success");
  expect(resolveNotificationIconVariant(TIPO_VACACIONES_RECHAZADO)).toBe("error");
  expect(resolveNotificationIconVariant(TIPO_PERMISO_AUSENCIA_RECHAZADO)).toBe("error");
  expect(resolveNotificationIconVariant(TIPO_VACACIONES_SOLICITADA)).toBe("info");
  expect(resolveNotificationIconVariant(TIPO_PERMISO_AUSENCIA_SOLICITADA)).toBe("info");
  expect(resolveNotificationIconVariant(TIPO_OC_AUTORIZADA)).toBe("info");
  expect(resolveNotificationIconVariant("tipo_que_no_existe")).toBe("info");
});

test("un tipo desconocido no tiene destino", () => {
  expect(resolveNotificationTarget(notificacion("otro_evento", "rh", { solicitud_id: 4 }), ADMIN)).toBeNull();
});
