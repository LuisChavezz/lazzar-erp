import { expect, test } from "@playwright/test";
import {
  COMPANY_LABEL_MAX_AGE_MS,
  resolveCompanyLabel,
} from "@/src/features/workspace/utils/resolveCompanyLabel";

/**
 * EC-842: el nombre de la empresa se guarda con su id y su fecha; solo se
 * consulta `mis-empresas/` cuando falta, es de otra empresa o caducó.
 */

const NOW = 1_800_000_000_000;
const label = (id: number, fetchedAt?: number) => ({ id, name: `Empresa ${id}`, rfc: null, fetchedAt });

test.describe("resolveCompanyLabel", () => {
  test("store sin hidratar: nada que mostrar ni buscar", () => {
    expect(resolveCompanyLabel({ hasHydrated: false, companyId: 1, storedLabel: label(1, NOW), now: NOW })).toEqual({
      label: null,
      needsLookup: false,
    });
  });

  test("empresa sin confirmar: nada que mostrar ni buscar", () => {
    expect(resolveCompanyLabel({ hasHydrated: true, companyId: null, storedLabel: label(1, NOW), now: NOW })).toEqual({
      label: null,
      needsLookup: false,
    });
  });

  test("nombre guardado vigente para la misma empresa: se usa sin consultar", () => {
    const stored = label(1, NOW - 60_000);
    expect(resolveCompanyLabel({ hasHydrated: true, companyId: 1, storedLabel: stored, now: NOW })).toEqual({
      label: stored,
      needsLookup: false,
    });
  });

  test("nombre guardado caducado para la misma empresa: se muestra y se revalida", () => {
    const stored = label(1, NOW - COMPANY_LABEL_MAX_AGE_MS);
    expect(resolveCompanyLabel({ hasHydrated: true, companyId: 1, storedLabel: stored, now: NOW })).toEqual({
      label: stored,
      needsLookup: true,
    });
  });

  test("nombre guardado sin fecha (anterior a la caducidad): se revalida", () => {
    const stored = label(1);
    expect(resolveCompanyLabel({ hasHydrated: true, companyId: 1, storedLabel: stored, now: NOW })).toEqual({
      label: stored,
      needsLookup: true,
    });
  });

  test("nombre guardado de otra empresa: no se muestra y se busca", () => {
    expect(resolveCompanyLabel({ hasHydrated: true, companyId: 2, storedLabel: label(1, NOW), now: NOW })).toEqual({
      label: null,
      needsLookup: true,
    });
  });

  test("sin nombre guardado: se busca", () => {
    expect(resolveCompanyLabel({ hasHydrated: true, companyId: 1, storedLabel: null, now: NOW })).toEqual({
      label: null,
      needsLookup: true,
    });
  });
});
