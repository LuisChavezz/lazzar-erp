import { expect, test } from "@playwright/test";
import { visibleProductionOrderStatusOptions } from "@/src/features/production-orders/utils/productionOrderPermissions";
import { isProductionOrderStatusQueryEnabled } from "@/src/features/production-order-status/hooks/useProductionOrderStatus";
import {
  canGenerateSalidaMaquila,
  canReadSalidaMaquila,
  canWriteSalidaMaquila,
} from "@/src/features/maquila-outputs/utils/salidaMaquilaAccess";
import { getSalidaMaquilaColumns } from "@/src/features/maquila-outputs/components/SalidaMaquilaColumns";
import { canSeeProductionCosts, hasProductionPermission } from "@/src/utils/productionPermissions";

const canEditProductionOrder = (u?: never) => hasProductionPermission(u, "OP", "E");
const canCreateProductionOrder = (u?: never) => hasProductionPermission(u, "OP", "C");

/**
 * EC-895: las escrituras de la OP usan los códigos que exigirá el backend
 * (EC-899). Cambiar estatus, editar la ruta crítica y recalcular consumos
 * exigen `E-PRODUCCION-OP`; "Crear OP" (listado y pre-orden) exige
 * `C-PRODUCCION-OP`. El código de lectura no basta. El admin pasa siempre.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;
const soloLectura = user(["R-PRODUCCION", "R-PRODUCCION-OP", "R-PRODUCCION-OB", "R-PRODUCCION-OR", "R-PRODUCCION-CM"]);

test.describe("canEditProductionOrder (estatus, ruta crítica, recálculo)", () => {
  test("con E-PRODUCCION-OP sí", () => {
    expect(canEditProductionOrder(user(["R-PRODUCCION-OP", "E-PRODUCCION-OP"]))).toBe(true);
  });

  test("sin E-PRODUCCION-OP no, aunque tenga lectura, alta o baja", () => {
    expect(canEditProductionOrder(soloLectura)).toBe(false);
    expect(canEditProductionOrder(user(["R-PRODUCCION-OP", "C-PRODUCCION-OP", "D-PRODUCCION-OP"]))).toBe(false);
    expect(canEditProductionOrder(user(["E-PRODUCCION-OB", "E-PRODUCCION-OR", "E-PRODUCCION-CM"]))).toBe(false);
    expect(canEditProductionOrder(undefined)).toBe(false);
  });

  test("el admin sí", () => {
    expect(canEditProductionOrder(admin)).toBe(true);
  });
});

test.describe("canCreateProductionOrder (Crear OP desde pre-orden y listado)", () => {
  test("con C-PRODUCCION-OP sí", () => {
    expect(canCreateProductionOrder(user(["R-PRODUCCION", "C-PRODUCCION-OP"]))).toBe(true);
  });

  test("sin C-PRODUCCION-OP no, aunque pueda leer o editar", () => {
    expect(canCreateProductionOrder(soloLectura)).toBe(false);
    expect(canCreateProductionOrder(user(["R-PRODUCCION-OP", "E-PRODUCCION-OP"]))).toBe(false);
  });

  test("el admin sí", () => {
    expect(canCreateProductionOrder(admin)).toBe(true);
  });
});

test.describe("visibleProductionOrderStatusOptions (menú Cambiar estatus)", () => {
  // Destinos como los manda `GET estatus/`: 3 En producción, 6 Detenido, 7 Cancelado.
  const options = [3, 6, 7].map((estatus_op) => ({ estatus_op, etiqueta: String(estatus_op), permitido: true }));
  const destinos = (u: never) => visibleProductionOrderStatusOptions(options, u).map((o) => o.estatus_op);

  test("con E- solo: sin Cancelado", () => {
    expect(destinos(user(["R-PRODUCCION-OP", "E-PRODUCCION-OP"]))).toEqual([3, 6]);
  });

  test("con E- y D-: con Cancelado", () => {
    expect(destinos(user(["R-PRODUCCION-OP", "E-PRODUCCION-OP", "D-PRODUCCION-OP"]))).toEqual([3, 6, 7]);
  });

  test("D- sin E- no abre el menú", () => {
    expect(destinos(user(["R-PRODUCCION-OP", "D-PRODUCCION-OP"]))).toEqual([]);
    expect(destinos(soloLectura)).toEqual([]);
  });

  test("el admin ve todos", () => {
    expect(destinos(admin)).toEqual([3, 6, 7]);
  });
});

test.describe("GET estatus/ de la OP (EC-895)", () => {
  test("solo se pide con el permiso de edición y un id válido", () => {
    expect(isProductionOrderStatusQueryEnabled(47, true)).toBe(true);
    expect(isProductionOrderStatusQueryEnabled(47, false)).toBe(false);
    expect(isProductionOrderStatusQueryEnabled(0, true)).toBe(false);
  });
});

/**
 * EC-868: "Generar SM" captura y muestra precios de maquila, así que exige
 * `R-PRODUCCION-COSTOS` además de `C-PRODUCCION-OP`; cancelar sigue solo con
 * `C-PRODUCCION-OP`. Recibirla ya no es acción de la SM (se hace en WMS).
 */
test.describe("salida a maquila: leer, generar y cancelar", () => {
  test("generar exige C-PRODUCCION-OP y R-PRODUCCION-COSTOS", () => {
    expect(canGenerateSalidaMaquila(user(["R-PRODUCCION-OP", "C-PRODUCCION-OP", "R-PRODUCCION-COSTOS"]))).toBe(true);
    expect(canGenerateSalidaMaquila(user(["R-PRODUCCION-OP", "C-PRODUCCION-OP"]))).toBe(false);
    expect(canGenerateSalidaMaquila(user(["R-PRODUCCION-OP", "R-PRODUCCION-COSTOS"]))).toBe(false);
    expect(canGenerateSalidaMaquila(admin)).toBe(true);
    expect(canGenerateSalidaMaquila(undefined)).toBe(false);
  });

  test("leer SM (sección de OB y OR) exige R-PRODUCCION-OP, como su listado (EC-911)", () => {
    expect(canReadSalidaMaquila(user(["R-PRODUCCION", "R-PRODUCCION-OP"]))).toBe(true);
    // Rol WMS real: OB, OR y CM, sin nada de OP.
    expect(
      canReadSalidaMaquila(user(["R-PRODUCCION", "R-PRODUCCION-OB", "C-PRODUCCION-OB", "R-PRODUCCION-OR", "R-PRODUCCION-CM"])),
    ).toBe(false);
    expect(canReadSalidaMaquila(admin)).toBe(true);
    expect(canReadSalidaMaquila(undefined)).toBe(false);
  });

  test("cancelar no pide el permiso de costos", () => {
    expect(canWriteSalidaMaquila(user(["R-PRODUCCION-OP", "C-PRODUCCION-OP"]))).toBe(true);
    expect(canWriteSalidaMaquila(soloLectura)).toBe(false);
  });
});

/**
 * EC-868: los importes de la SM (precio, importe y total) solo se muestran con
 * `R-PRODUCCION-COSTOS`, el código con el que el backend oculta los costos de
 * producción (#1135). El admin pasa siempre.
 */
test.describe("canSeeProductionCosts y la columna Total de las SM", () => {
  test("solo con R-PRODUCCION-COSTOS (o admin)", () => {
    expect(canSeeProductionCosts(user(["R-PRODUCCION-COSTOS"]))).toBe(true);
    expect(canSeeProductionCosts(admin)).toBe(true);
    expect(canSeeProductionCosts(soloLectura)).toBe(false);
    expect(canSeeProductionCosts(user(["R-PRODUCCION-OP", "C-PRODUCCION-OP", "E-PRODUCCION-OP"]))).toBe(false);
    expect(canSeeProductionCosts(undefined)).toBe(false);
  });

  test("sin costos el listado no lleva la columna Total; con ellos, al final", () => {
    const ids = (canSeeAmounts: boolean) =>
      getSalidaMaquilaColumns(() => {}, canSeeAmounts).map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey);
    expect(ids(false)).not.toContain("total");
    expect(ids(true)).toEqual([...ids(false), "total"]);
  });
});
