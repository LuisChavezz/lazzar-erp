import { expect, test } from "@playwright/test";
import toast from "react-hot-toast";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import {
  CONCILIACION_WRITE_PERMISSION_REASON,
  FINANCE_WRITE_PERMISSION,
  FINANCE_WRITE_PERMISSION_REASON,
  POLIZA_WRITE_PERMISSION_REASON,
} from "@/src/constants/financePermissions";
import { CREDIT_NOTE_WRITE_PERMISSION_REASON } from "@/src/features/credit-notes/utils/creditNoteStamping";
import { getVisibleActionItems } from "@/src/utils/actionMenuVisibility";
import { financeWriteBlock, getFinanceWriteState, guardFinanceWrite } from "@/src/utils/financeWrite";

/**
 * Pruebas unitarias de EC-733: la compuerta de escritura de Finanzas. El código
 * y los motivos reflejan el backend (`PermisoFinanzas`, nucleo-erp #879); un
 * cambio aquí solo se notaría como un 403 en producción.
 */

/** Rol 7 "Contabilidad" sin `E-FIN-FACTURAS`: conserva `C-CONTABILIDAD-CXC`. */
const contabilidadSinEscritura = {
  role: "user",
  permissions: ["R-CONTABILIDAD", "R-CONTABILIDAD-CXC", "C-CONTABILIDAD-CXC", "D-CONTABILIDAD-CXC"],
};
const contabilidad = { role: "user", permissions: [...contabilidadSinEscritura.permissions, "E-FIN-FACTURAS"] };
const admin = { role: "admin", permissions: [] };

test("el permiso de escritura es exactamente E-FIN-FACTURAS", () => {
  expect(FINANCE_WRITE_PERMISSION).toBe("E-FIN-FACTURAS");
});

test("cada módulo muestra el `detail` del 403 de su viewset", () => {
  expect(FINANCE_WRITE_PERMISSION_REASON).toBe("No tienes permiso para modificar datos de finanzas.");
  expect(POLIZA_WRITE_PERMISSION_REASON).toBe("No tienes permiso para registrar o cancelar pólizas.");
  expect(CONCILIACION_WRITE_PERMISSION_REASON).toBe("No tienes permiso para conciliar cuentas bancarias.");
  expect(CREDIT_NOTE_WRITE_PERMISSION_REASON).toBe(
    "No tienes permiso para registrar o cancelar notas de crédito.",
  );
});

test.describe("getFinanceWriteState", () => {
  test("C-CONTABILIDAD-CXC sin E-FIN-FACTURAS no escribe (CxC incluida)", () => {
    expect(getFinanceWriteState(contabilidadSinEscritura, "authenticated").canWrite).toBe(false);
    expect(getFinanceWriteState(contabilidad, "authenticated").canWrite).toBe(true);
  });

  test("el admin escribe aunque no traiga códigos", () => {
    expect(getFinanceWriteState(admin, "authenticated")).toEqual({ canWrite: true, isSessionLoading: false });
  });

  test("mientras la sesión carga falla cerrado, también para un admin", () => {
    expect(getFinanceWriteState(admin, "loading")).toEqual({ canWrite: false, isSessionLoading: true });
    expect(getFinanceWriteState(undefined, "unauthenticated")).toEqual({
      canWrite: false,
      isSessionLoading: false,
    });
  });
});

test.describe("financeWriteBlock", () => {
  test("con permiso no bloquea; sin él bloquea con el motivo", () => {
    expect(financeWriteBlock(getFinanceWriteState(contabilidad, "authenticated"), POLIZA_WRITE_PERMISSION_REASON)).toEqual({
      disabled: false,
      description: undefined,
    });
    expect(
      financeWriteBlock(getFinanceWriteState(contabilidadSinEscritura, "authenticated"), POLIZA_WRITE_PERMISSION_REASON),
    ).toEqual({ disabled: true, description: POLIZA_WRITE_PERMISSION_REASON });
  });

  test("mientras la sesión carga bloquea SIN motivo (un admin no ve 'No tienes permiso…')", () => {
    expect(financeWriteBlock(getFinanceWriteState(admin, "loading"), FINANCE_WRITE_PERMISSION_REASON)).toEqual({
      disabled: true,
      description: undefined,
    });
  });
});

test.describe("guardFinanceWrite", () => {
  const withToastSpy = (run: (calls: string[]) => void) => {
    const original = toast.error;
    const calls: string[] = [];
    toast.error = ((message: string) => {
      calls.push(message);
      return "";
    }) as typeof toast.error;
    try {
      run(calls);
    } finally {
      toast.error = original;
    }
  };

  test("con permiso deja pasar sin avisar", () => {
    withToastSpy((calls) => {
      expect(guardFinanceWrite(getFinanceWriteState(admin, "authenticated"), FINANCE_WRITE_PERMISSION_REASON)).toBe(true);
      expect(calls).toEqual([]);
    });
  });

  test("sin permiso corta y avisa con el motivo del módulo", () => {
    withToastSpy((calls) => {
      const write = getFinanceWriteState(contabilidadSinEscritura, "authenticated");
      expect(guardFinanceWrite(write, CONCILIACION_WRITE_PERMISSION_REASON)).toBe(false);
      expect(calls).toEqual([CONCILIACION_WRITE_PERMISSION_REASON]);
    });
  });

  test("mientras la sesión carga corta sin avisar", () => {
    withToastSpy((calls) => {
      expect(guardFinanceWrite(getFinanceWriteState(admin, "loading"), FINANCE_WRITE_PERMISSION_REASON)).toBe(false);
      expect(calls).toEqual([]);
    });
  });
});

test("en los catálogos las escrituras con `permission` se ocultan sin E-FIN-FACTURAS", () => {
  const Icon = () => null;
  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: Icon },
    { label: "Editar", icon: Icon, permission: FINANCE_WRITE_PERMISSION },
    { label: "Desactivar", icon: Icon, permission: FINANCE_WRITE_PERMISSION },
  ];
  expect(getVisibleActionItems(items, contabilidadSinEscritura).map((i) => i.label)).toEqual(["Ver detalle"]);
  expect(getVisibleActionItems(items, admin)).toHaveLength(3);
});
