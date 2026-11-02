import { expect, test } from "@playwright/test";
import type { PickingOnboardingProgramacion } from "@/src/features/picking/interfaces/picking-onboarding.interface";
import {
  getProgramacionesSearchText,
  matchesProgramacionDestino,
} from "@/src/features/orders/utils/wmsOrderProgramaciones";

/** Pruebas unitarias de EC-687: filtro y búsqueda de la columna Programación de Pedidos de Almacén. */

const programacion = (
  destino: string,
  extra: Partial<PickingOnboardingProgramacion> = {},
): PickingOnboardingProgramacion => ({
  destino,
  cantidad: 5,
  comentarios: "",
  almacen_sugerido: null,
  ...extra,
});

// Forma real del pedido 253 en el onboarding (empresa 1).
const pedido253 = {
  programaciones: [
    programacion("CORTE_MANGA"),
    programacion("BORDADO", { almacen_sugerido: { id: 31, nombre: "BORDADOS" } }),
    programacion("REFLEJANTE"),
  ],
};

test.describe("matchesProgramacionDestino", () => {
  test("pasa si ALGUNA programación va al destino, no solo la primera", () => {
    expect(matchesProgramacionDestino(pedido253, "BORDADO")).toBe(true);
    expect(matchesProgramacionDestino(pedido253, "REFLEJANTE")).toBe(true);
  });

  test("no pasa si ninguna programación va al destino", () => {
    expect(matchesProgramacionDestino(pedido253, "APARTADO")).toBe(false);
  });

  test("compara el código del backend, no la etiqueta", () => {
    expect(matchesProgramacionDestino(pedido253, "Bordado")).toBe(false);
    expect(matchesProgramacionDestino(pedido253, "Corte de manga")).toBe(false);
  });

  test("un pedido sin programaciones no pasa ningún destino", () => {
    expect(matchesProgramacionDestino({ programaciones: [] }, "EMBARQUE")).toBe(false);
  });

  test("sin filtro pasa todo, aun sin programaciones", () => {
    expect(matchesProgramacionDestino(pedido253, undefined)).toBe(true);
    expect(matchesProgramacionDestino({ programaciones: [] }, undefined)).toBe(true);
  });
});

test.describe("getProgramacionesSearchText", () => {
  test("incluye etiqueta del destino y nombre del almacén sugerido", () => {
    const text = getProgramacionesSearchText(pedido253);
    expect(text).toContain("Bordado");
    expect(text).toContain("BORDADOS");
    expect(text).toContain("Corte de manga");
  });

  test("incluye los comentarios no vacíos y omite los vacíos", () => {
    const text = getProgramacionesSearchText({
      programaciones: [
        programacion("EMBARQUE", { comentarios: "  urgente para el lunes  " }),
        programacion("APARTADO", { comentarios: "   " }),
      ],
    });
    expect(text).toBe("Embarque urgente para el lunes Apartado");
  });

  test("sin programaciones da texto vacío", () => {
    expect(getProgramacionesSearchText({ programaciones: [] })).toBe("");
  });
});
