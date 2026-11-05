import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";

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

test("un 403 con solo non_field_errors muestra ese mensaje", () => {
  const { errors, set } = collectFieldErrors();
  expect(
    handleDrfWriteError(axiosError(403, { non_field_errors: ["Sin acceso."], nombre: ["x"] }), FALLBACK, FIELDS, set),
  ).toBe("Sin acceso.");
  expect(errors).toEqual({});
});

test("un 403 con HTML en detail cae al respaldo", () => {
  expect(handleDrfWriteError(axiosError(403, { detail: "<html>Forbidden</html>" }), FALLBACK, FIELDS)).toBe(
    FALLBACK,
  );
});

// `drfActionErrorMessage`: misma regla del 403; 400, 404 y 409 sin cambios.
const GONE = "Ya no existe.";

test("acción: un 403 sigue la regla única", () => {
  expect(drfActionErrorMessage(axiosError(403, { detail: "Sin permiso." }), FALLBACK, GONE)).toBe("Sin permiso.");
  expect(drfActionErrorMessage(axiosError(403, { non_field_errors: ["Motivo."] }), FALLBACK, GONE)).toBe(
    "Motivo.",
  );
  expect(drfActionErrorMessage(axiosError(403, { campo: ["x"] }), FALLBACK, GONE)).toBe(FALLBACK);
  expect(drfActionErrorMessage(axiosError(403, "<html>Forbidden</html>"), FALLBACK, GONE)).toBe(FALLBACK);
  expect(drfActionErrorMessage(axiosError(403, { detail: "<html>" }), FALLBACK, GONE)).toBe(FALLBACK);
});

test("acción: 400, 404, 409 y 5xx conservan su manejo", () => {
  expect(drfActionErrorMessage(axiosError(400, { campo: ["Inválido."] }), FALLBACK, GONE)).toBe("Inválido.");
  expect(drfActionErrorMessage(axiosError(404), FALLBACK, GONE)).toBe(GONE);
  expect(drfActionErrorMessage(axiosError(409, { detail: "Choca con X." }), FALLBACK, GONE)).toBe("Choca con X.");
  expect(drfActionErrorMessage(axiosError(409, { detail: ["lista"] }), FALLBACK, GONE)).toBe(FALLBACK);
  expect(drfActionErrorMessage(axiosError(500, { detail: "Algo." }), FALLBACK, GONE)).toBe(FALLBACK);
});
