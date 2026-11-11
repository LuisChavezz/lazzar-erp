import { expect, test } from "@playwright/test";
import { FiscalAddressSchema } from "@/src/features/sat/schemas/fiscal-address.schema";

/**
 * EC-860: el schema del formulario de Dirección fiscal sigue las reglas del
 * backend (`nucleo/api/domicilio_fiscal.py`): todo opcional, longitudes
 * máximas y CP de 5 dígitos cuando viene.
 */

const empty = {
  calle: "",
  numero_exterior: "",
  numero_interior: "",
  colonia: "",
  localidad: "",
  municipio: "",
  estado: "",
  pais: "MEX",
  codigo_postal: "",
};

const firstMessage = (value: Partial<typeof empty>) => {
  const parsed = FiscalAddressSchema.safeParse({ ...empty, ...value });
  return parsed.success ? undefined : parsed.error.issues[0];
};

test("acepta el domicilio vacío que devuelve una empresa sin capturar", () => {
  expect(FiscalAddressSchema.safeParse(empty).success).toBe(true);
  expect(FiscalAddressSchema.safeParse({ ...empty, pais: "" }).success).toBe(true);
});

test("ningún campo es obligatorio: basta con uno solo", () => {
  expect(FiscalAddressSchema.safeParse({ ...empty, calle: "AV. JUÁREZ" }).success).toBe(true);
});

test("código postal: vacío o exactamente 5 dígitos", () => {
  expect(firstMessage({ codigo_postal: "44100" })).toBeUndefined();
  expect(firstMessage({ codigo_postal: "" })).toBeUndefined();
  for (const invalid of ["4410", "441000", "44A00", " 4410 ", "44 100"]) {
    const issue = firstMessage({ codigo_postal: invalid });
    expect(issue?.path).toEqual(["codigo_postal"]);
    expect(issue?.message).toBe("El código postal debe tener 5 dígitos");
  }
});

test("país: clave de hasta 3 caracteres, como el backend", () => {
  expect(firstMessage({ pais: "MEX" })).toBeUndefined();
  const issue = firstMessage({ pais: "MÉXICO" });
  expect(issue?.path).toEqual(["pais"]);
  expect(issue?.message).toBe("El país no puede tener más de 3 caracteres");
});

test("longitudes máximas del backend", () => {
  const cases: Array<[keyof typeof empty, number]> = [
    ["calle", 255],
    ["numero_exterior", 30],
    ["numero_interior", 30],
    ["colonia", 120],
    ["localidad", 120],
    ["municipio", 120],
    ["estado", 120],
  ];
  for (const [field, max] of cases) {
    expect(firstMessage({ [field]: "X".repeat(max) })).toBeUndefined();
    expect(firstMessage({ [field]: "X".repeat(max + 1) })?.path).toEqual([field]);
  }
});

test("recorta espacios antes de validar, como el backend", () => {
  const parsed = FiscalAddressSchema.parse({
    ...empty,
    calle: `${"X".repeat(255)} `,
    codigo_postal: " 44100 ",
    pais: " mex ",
  });
  expect(parsed.calle).toHaveLength(255);
  expect(parsed.codigo_postal).toBe("44100");
  expect(parsed.pais).toBe("mex");
});
