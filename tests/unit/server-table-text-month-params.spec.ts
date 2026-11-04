import { expect, test } from "@playwright/test";
import {
  defineServerTable,
  monthParam,
  readServerTableState,
  textParam,
  toServerTableCriteria,
} from "@/src/utils/serverTableParams";

/**
 * Pruebas unitarias de EC-766: codecs de texto libre exacto (`textParam`) y de
 * mes "AAAA-MM" (`monthParam`) para las tablas en modo servidor.
 */

test.describe("textParam", () => {
  test("conserva el valor crudo, sin recortar ni normalizar", () => {
    expect(textParam.parse("Playera Azul")).toBe("Playera Azul");
    expect(textParam.parse(" Playera  ")).toBe(" Playera  ");
    expect(textParam.parse("ÁRBOL / 100% algodón")).toBe("ÁRBOL / 100% algodón");
    expect(textParam.serialize(" Playera  ")).toBe(" Playera  ");
  });

  test("descarta el texto vacío o hecho solo de espacios", () => {
    expect(textParam.parse("")).toBeNull();
    expect(textParam.parse("   ")).toBeNull();
  });

  test("ida y vuelta por la URL sin alterar el valor", () => {
    const definition = defineServerTable({ filters: { nombre: textParam } });
    const query = new URLSearchParams({ nombre: " Playera & Co. " });
    const state = readServerTableState(definition, (key) => query.get(key));
    expect(state.filters.nombre).toBe(" Playera & Co. ");
    expect(toServerTableCriteria(definition, state)).toEqual({ nombre: " Playera & Co. " });
  });
});

test.describe("monthParam", () => {
  test("acepta AAAA-MM con mes de 01 a 12", () => {
    expect(monthParam.parse("2026-01")).toBe("2026-01");
    expect(monthParam.parse("2026-12")).toBe("2026-12");
    expect(monthParam.serialize("2026-11")).toBe("2026-11");
  });

  test("rechaza meses fuera de rango y otros formatos", () => {
    for (const raw of ["2026-00", "2026-13", "2026-1", "26-01", "2026-01-01", "2026/01", "oct", " 2026-01"]) {
      expect(monthParam.parse(raw), raw).toBeNull();
    }
  });
});
