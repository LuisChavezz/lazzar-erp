import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  FISCAL_ADDRESS_SAVE_FALLBACK,
  fiscalAddressLoadErrorMessage,
  fiscalAddressPatch,
  routeFiscalAddressSaveError,
} from "@/src/features/sat/utils/fiscalAddressForm";
import { FiscalAddressSchema } from "@/src/features/sat/schemas/fiscal-address.schema";
import type { FiscalAddress } from "@/src/features/sat/interfaces/fiscal-address.interface";

/**
 * EC-860: lo que el formulario de Dirección fiscal manda (solo lo cambiado) y
 * cómo reparte los rechazos del backend entre campos, banner y toast.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const saved: FiscalAddress = {
  calle: "AV. JUÁREZ",
  numero_exterior: "12",
  numero_interior: "",
  colonia: "CENTRO",
  localidad: "",
  municipio: "GUADALAJARA",
  estado: "JALISCO",
  pais: "MEX",
  codigo_postal: "44100",
};

/** Lo que el formulario entregaría tras validar (recortado por el schema). */
const submitted = (values: Partial<FiscalAddress>): FiscalAddress =>
  FiscalAddressSchema.parse({ ...saved, ...values });

test.describe("fiscalAddressPatch", () => {
  test("manda solo el campo cambiado", () => {
    expect(fiscalAddressPatch(saved, submitted({ codigo_postal: "44600" }))).toEqual({
      codigo_postal: "44600",
    });
  });

  test("sin cambios no hay nada que mandar", () => {
    expect(fiscalAddressPatch(saved, submitted({}))).toEqual({});
  });

  test("espacios añadidos no cuentan como cambio (el schema los recorta)", () => {
    expect(fiscalAddressPatch(saved, submitted({ calle: "  AV. JUÁREZ ", codigo_postal: "44100 " }))).toEqual({});
  });

  test("vaciar un campo sí es un cambio", () => {
    expect(fiscalAddressPatch(saved, submitted({ colonia: "", pais: "" }))).toEqual({ colonia: "", pais: "" });
  });
});

test.describe("routeFiscalAddressSaveError", () => {
  test("400 en codigo_postal: bajo el campo, sin banner", () => {
    const routed = routeFiscalAddressSaveError(
      httpError(400, { codigo_postal: ["El código postal debe tener 5 dígitos."] }),
    );
    expect(routed.fieldErrors).toEqual({ codigo_postal: "El código postal debe tener 5 dígitos." });
    expect(routed.formError).toBeNull();
    expect(routed.toastMessage).toBe(FISCAL_ADDRESS_SAVE_FALLBACK);
  });

  test('400 {"empresa": "<texto>"}: al banner (la clave no es un campo)', () => {
    const routed = routeFiscalAddressSaveError(
      httpError(400, { empresa: "El usuario no tiene empresa activa." }),
    );
    expect(routed.fieldErrors).toEqual({});
    expect(routed.formError).toBe("El usuario no tiene empresa activa.");
    expect(routed.toastMessage).toBe("El usuario no tiene empresa activa.");
  });

  test('403 {"detail": ...}: al banner, nunca a un campo', () => {
    const routed = routeFiscalAddressSaveError(
      httpError(403, { detail: "Solo un administrador puede cambiar el domicilio fiscal." }),
    );
    expect(routed.fieldErrors).toEqual({});
    expect(routed.formError).toBe("Solo un administrador puede cambiar el domicilio fiscal.");
  });

  test("mixto (campo + no campo): el campo bajo su input y el resto al banner", () => {
    const routed = routeFiscalAddressSaveError(
      httpError(400, {
        codigo_postal: ["Asegúrese de que este campo no tenga más de 5 caracteres."],
        non_field_errors: ["Datos inválidos."],
      }),
    );
    expect(routed.fieldErrors).toEqual({
      codigo_postal: "Asegúrese de que este campo no tenga más de 5 caracteres.",
    });
    expect(routed.formError).toBe("Datos inválidos.");
  });

  test("red caída o 5xx: respaldo en banner y toast", () => {
    const network = new AxiosError("Network Error", "ERR_NETWORK");
    expect(routeFiscalAddressSaveError(network).formError).toBe(FISCAL_ADDRESS_SAVE_FALLBACK);
    expect(routeFiscalAddressSaveError(httpError(500, "<html>")).formError).toBe(
      FISCAL_ADDRESS_SAVE_FALLBACK,
    );
  });
});

test.describe("fiscalAddressLoadErrorMessage", () => {
  test("un 4xx muestra el mensaje del backend", () => {
    expect(
      fiscalAddressLoadErrorMessage(httpError(400, { empresa: "El usuario no tiene empresa activa." })),
    ).toBe("El usuario no tiene empresa activa.");
  });

  test("red y 5xx hablan de la conexión", () => {
    const copy = "Revisa tu conexión e inténtalo de nuevo.";
    expect(fiscalAddressLoadErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(copy);
    expect(fiscalAddressLoadErrorMessage(httpError(502, "Bad Gateway"))).toBe(copy);
  });
});
