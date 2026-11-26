import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { parseEmbroideryOrderError } from "@/src/features/embroidery/utils/parseEmbroideryOrderError";
import { parseReflectiveOrderError } from "@/src/features/reflective-orders/utils/parseReflectiveOrderError";
import { parseCorteMangaOrderError } from "@/src/features/corte-manga/utils/parseCorteMangaOrderError";

/**
 * EC-957: el alta de OB, OR y OCM rechaza un pedido cancelado, dado de baja,
 * inexistente o retenido con `{"pedido": "…"}` como STRING (nucleo-erp#1370).
 * Es de negocio: va al banner, no a los errores de campo del Paso 1. El error
 * de campo del serializer (lista) sigue siendo de campo.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const PARSERS = [
  ["bordado", parseEmbroideryOrderError],
  ["reflejante", parseReflectiveOrderError],
  ["corte de manga", parseCorteMangaOrderError],
] as const;

for (const [name, parse] of PARSERS) {
  test(`${name}: el rechazo de negocio del pedido va al banner`, () => {
    const message = "El pedido P-00178-2026 está cancelado o dado de baja.";
    const parsed = parse(httpError(400, { pedido: message }));
    expect(parsed.formError).toBe(message);
    expect(parsed.fieldErrors.pedido).toBeUndefined();
    expect(parsed.messages).toEqual([message]);
  });

  test(`${name}: el error de campo del serializer sigue siendo de campo`, () => {
    const parsed = parse(httpError(400, { pedido: ["Este campo es requerido."] }));
    expect(parsed.fieldErrors.pedido).toBe("Este campo es requerido.");
  });
}
