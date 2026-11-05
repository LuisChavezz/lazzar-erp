import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { parseCorteMangaOrderError } from "@/src/features/corte-manga/utils/parseCorteMangaOrderError";
import { parseEmbroideryOrderError } from "@/src/features/embroidery/utils/parseEmbroideryOrderError";
import { parseReflectiveOrderError } from "@/src/features/reflective-orders/utils/parseReflectiveOrderError";
import { parseTransferPickingError } from "@/src/features/picking/hooks/useTransferPicking";
import { downloadCobroRepErrorMessage } from "@/src/features/collections/utils/cobroRepDownload";

/**
 * Pruebas unitarias de EC-770: los 403 que cada feature resolvía a mano siguen
 * la regla única del módulo (`forbiddenDetailMessage`): `detail` → primer
 * `non_field_errors` → texto fijo del consumidor; nunca el valor de una llave
 * de campo ni errores de campo. El 400 conserva su manejo. Corren con
 * `npm run test:unit`.
 */

const axiosError = (status: number, data?: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const PARSERS = [
  ["corte-manga", parseCorteMangaOrderError],
  ["bordado", parseEmbroideryOrderError],
  ["reflejante", parseReflectiveOrderError],
] as const;

for (const [name, parse] of PARSERS) {
  test(`${name}: un 403 usa detail, luego non_field_errors, nunca campos`, () => {
    expect(parse(axiosError(403, { detail: "Sin permiso." }))).toMatchObject({
      formError: "Sin permiso.",
      fieldErrors: {},
      messages: ["Sin permiso."],
    });
    expect(parse(axiosError(403, { non_field_errors: ["Motivo."], pedido: ["x"] }))).toMatchObject({
      formError: "Motivo.",
      fieldErrors: {},
      messages: ["Motivo."],
    });
    const soloCampos = parse(axiosError(403, { pedido: ["x"], err: "y" }));
    expect(soloCampos.formError).toBeUndefined();
    expect(soloCampos.fieldErrors).toEqual({});
    expect(soloCampos.messages).toEqual([]);
    expect(parse(axiosError(403, "<html>Forbidden</html>")).formError).toBeUndefined();
  });

  test(`${name}: un 400 sigue pintando el campo`, () => {
    const parsed = parse(axiosError(400, { pedido: ["Pedido inválido."] }));
    expect(parsed.fieldErrors).toEqual({ pedido: "Pedido inválido." });
  });
}

test("traslado de surtido: un 403 sigue la regla única", () => {
  const noop = () => {};
  expect(parseTransferPickingError(axiosError(403, { detail: "Sin acceso." }), noop)).toBe("Sin acceso.");
  expect(parseTransferPickingError(axiosError(403, { non_field_errors: ["Motivo."] }), noop)).toBe("Motivo.");
  expect(parseTransferPickingError(axiosError(403, { almacen: ["x"] }), noop)).toBe(
    "No tienes permiso para trasladar surtidos.",
  );
});

test("descarga del REP: un 403 sigue la regla única", () => {
  expect(downloadCobroRepErrorMessage(axiosError(403, { detail: "No tienes acceso a Facturama." }))).toBe(
    "No tienes acceso a Facturama.",
  );
  expect(downloadCobroRepErrorMessage(axiosError(403, { cobro: ["x"] }))).toBe("No tienes acceso a Facturama.");
  expect(downloadCobroRepErrorMessage(axiosError(403, { non_field_errors: ["Motivo."] }))).toBe("Motivo.");
});
