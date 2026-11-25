import { expect, test } from "@playwright/test";
import {
  SIN_PRODUCTO_CATALOGO,
  workOrderGarmentLabel,
  workOrderProductGroupId,
  workOrderProductLabel,
} from "@/src/utils/workOrderProductLabel";
import {
  reflectiveLineDescripcion,
  reflectiveLineProductoNombre,
  reflectiveLineSampleSku,
} from "@/src/features/reflective-orders/hooks/useReflectiveStep2Form";
import type { ReflectiveOnboardingDetalle } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";
import {
  embroideryLineDescripcion,
  embroideryLineProductoNombre,
} from "@/src/features/embroidery/hooks/useEmbroideryStep2Form";
import type { EmbroideryOnboardingDetalle } from "@/src/features/embroidery/interfaces/embroidery.interface";

/** EC-963: rótulo de la prenda de un renglón de OR / OCM. */

test.describe("workOrderProductLabel", () => {
  test("una línea de catálogo conserva su nombre", () => {
    expect(workOrderProductLabel({ producto_nombre: "PLAYERA", producto_nombre_externo: null })).toBe("PLAYERA");
  });

  test("una muestra usa su nombre externo", () => {
    expect(
      workOrderProductLabel({ producto_nombre: null, producto_nombre_externo: "PANTALON CHAIN YSL | YELLOW N GOLD" }),
    ).toBe("PANTALON CHAIN YSL | YELLOW N GOLD");
  });

  test("sin nombre (detalle de la orden: la clave no llega) cae a «Sin producto de catálogo»", () => {
    expect(workOrderProductLabel({})).toBe(SIN_PRODUCTO_CATALOGO);
    expect(workOrderProductLabel({ producto_nombre: null, producto_nombre_externo: "   " })).toBe(
      SIN_PRODUCTO_CATALOGO,
    );
    expect(SIN_PRODUCTO_CATALOGO).toBe("Sin producto de catálogo");
  });

  test("el título de grupo de una muestra sin nombre lleva su SKU", () => {
    expect(workOrderGarmentLabel({ sku: "MP2177-302-28" })).toBe("Sin producto de catálogo · MP2177-302-28");
    expect(workOrderGarmentLabel({ sku: null })).toBe(SIN_PRODUCTO_CATALOGO);
    expect(workOrderGarmentLabel({ producto_nombre: "PLAYERA", sku: "PL-M" })).toBe("PLAYERA");
    expect(workOrderGarmentLabel({ producto_nombre_externo: "PANTALON", sku: "MP1" })).toBe("PANTALON");
  });

  test("agrupa por producto y, en una muestra, por su línea del pedido", () => {
    expect(workOrderProductGroupId({ producto: 8562, pedido_detalle: 2178 })).toBe(8562);
    expect(workOrderProductGroupId({ producto: null, pedido_detalle: 2177 })).not.toBe(
      workOrderProductGroupId({ producto: null, pedido_detalle: 2180 }),
    );
  });
});

test.describe("Paso 2 de la OR", () => {
  const base: ReflectiveOnboardingDetalle = {
    pedido_detalle_talla_id: 3231,
    pedido_detalle_id: 2177,
    producto_id: null,
    producto_nombre: null,
    talla_id: 17,
    talla_nombre: "28",
    color_id: 43,
    color_nombre: "AMARILLO NEON",
    cantidad_pedido: 1,
    cantidad_asignada: 0,
    cantidad_pendiente: 1,
    reflejante_config: null,
    sku: "MP2177-302-28",
    sku_proscai: null,
    producto_nombre_externo: "PANTALON CHAIN YSL | YELLOW N GOLD",
  };

  test("la muestra muestra su nombre externo y su SKU", () => {
    expect(reflectiveLineProductoNombre(base)).toBe("PANTALON CHAIN YSL | YELLOW N GOLD");
    expect(reflectiveLineSampleSku(base)).toBe("MP2177-302-28");
  });

  test("los avisos y el aria-label nombran la talla", () => {
    expect(reflectiveLineDescripcion(base)).toBe("PANTALON CHAIN YSL | YELLOW N GOLD · Talla 28");
    expect(reflectiveLineDescripcion({ ...base, talla_nombre: null })).toBe("PANTALON CHAIN YSL | YELLOW N GOLD");
  });

  test("una línea de catálogo se ve como antes: su nombre y sin SKU", () => {
    const catalogo = { ...base, producto_id: 8562, producto_nombre: "PLAYERA", producto_nombre_externo: null, sku: "PL-M" };
    expect(reflectiveLineProductoNombre(catalogo)).toBe("PLAYERA");
    expect(reflectiveLineSampleSku(catalogo)).toBeNull();
  });
});

test.describe("Paso 2 de la OB", () => {
  // Como llega del onboarding de OB: sin `producto_nombre_externo` (EC-964 no lo añadió aquí).
  const muestra = {
    pedido_detalle_talla_id: 3231,
    pedido_detalle_id: 2177,
    producto_id: null,
    producto_nombre: null,
    talla_id: 17,
    talla_nombre: "28",
    color_id: 43,
    color_nombre: "AMARILLO NEON",
    cantidad_pedido: 1,
    cantidad_asignada: 0,
    cantidad_pendiente: 1,
    sku: "MP2177-302-28",
    sku_proscai: null,
  } as EmbroideryOnboardingDetalle;

  test("una muestra se rotula sin id y el aviso la distingue por SKU y talla", () => {
    expect(embroideryLineProductoNombre(muestra)).toBe("Sin producto de catálogo");
    expect(embroideryLineDescripcion(muestra)).toBe("Sin producto de catálogo · MP2177-302-28 · Talla 28");
  });

  test("una línea de catálogo conserva su nombre", () => {
    const catalogo = { ...muestra, producto_id: 8523, producto_nombre: "ROMPEVIENTOS", sku: "RV-CH" };
    expect(embroideryLineProductoNombre(catalogo)).toBe("ROMPEVIENTOS");
    expect(embroideryLineDescripcion(catalogo)).toBe("ROMPEVIENTOS · Talla 28");
  });
});
