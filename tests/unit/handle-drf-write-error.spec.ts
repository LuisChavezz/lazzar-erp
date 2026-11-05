import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";

/**
 * Pruebas unitarias de EC-770: `handleDrfWriteError`, el manejo compartido de
 * errores de alta/edición. Un 403 muestra el `detail` del backend (o el
 * respaldo) y nunca pinta campos; el 400 y el resto conservan su manejo.
 * Corren con `npm run test:unit`.
 */

const axiosError = (status: number, data?: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const FIELDS = ["nombre", "codigo"] as const;
type Field = (typeof FIELDS)[number];
const FALLBACK = "No se pudo guardar.";

const collectFieldErrors = () => {
  const errors: Partial<Record<Field, string>> = {};
  const set = (field: Field, message: string) => {
    errors[field] = message;
  };
  return { errors, set };
};

test("un 403 con detail muestra ese detail", () => {
  expect(
    handleDrfWriteError(axiosError(403, { detail: "No tienes permiso para esto." }), FALLBACK, FIELDS),
  ).toBe("No tienes permiso para esto.");
});

test("un 403 sin detail cae al respaldo y no pinta campos", () => {
  const { errors, set } = collectFieldErrors();
  expect(handleDrfWriteError(axiosError(403, { nombre: ["x"], otra: ["y"] }), FALLBACK, FIELDS, set)).toBe(
    FALLBACK,
  );
  expect(errors).toEqual({});
  expect(handleDrfWriteError(axiosError(403), FALLBACK, FIELDS, set)).toBe(FALLBACK);
  expect(handleDrfWriteError(axiosError(403, "<html>Forbidden</html>"), FALLBACK, FIELDS, set)).toBe(
    FALLBACK,
  );
  expect(errors).toEqual({});
});

test("un 400 pinta los campos del formulario y muestra el mensaje de objeto", () => {
  const { errors, set } = collectFieldErrors();
  expect(
    handleDrfWriteError(
      axiosError(400, { nombre: ["Requerido."], codigo: "Duplicado.", non_field_errors: ["Revisa."] }),
      FALLBACK,
      FIELDS,
      set,
    ),
  ).toBe("Revisa.");
  expect(errors).toEqual({ nombre: "Requerido.", codigo: "Duplicado." });
});

test("un 400 de una llave que el formulario no muestra llega al toast", () => {
  const { errors, set } = collectFieldErrors();
  expect(handleDrfWriteError(axiosError(400, { empresa: ["Inválida."] }), FALLBACK, FIELDS, set)).toBe(
    "Inválida.",
  );
  expect(errors).toEqual({});
});

test("un 400 solo con campos del formulario cae al respaldo", () => {
  const { set } = collectFieldErrors();
  expect(handleDrfWriteError(axiosError(400, { nombre: ["Requerido."] }), FALLBACK, FIELDS, set)).toBe(
    FALLBACK,
  );
});

test("404, 409, 5xx y red caen al respaldo", () => {
  for (const status of [404, 409, 500]) {
    expect(handleDrfWriteError(axiosError(status, { detail: "Algo." }), FALLBACK, FIELDS)).toBe(FALLBACK);
  }
  expect(handleDrfWriteError(new AxiosError("Network Error", "ERR_NETWORK"), FALLBACK, FIELDS)).toBe(
    FALLBACK,
  );
  expect(handleDrfWriteError(new Error("boom"), FALLBACK, FIELDS)).toBe(FALLBACK);
});
