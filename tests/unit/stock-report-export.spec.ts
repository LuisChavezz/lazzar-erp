import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  slugifyFileNamePart,
  stockMovementReportFileName,
  stockReportExportErrorMessage,
  stockReportFileName,
} from "@/src/features/stock/utils/stockReportExport";

/**
 * Pruebas unitarias de EC-819: el nombre del archivo de los reportes por
 * periodo (espejo del `Content-Disposition` del backend, que CORS no deja
 * leer) y el mensaje de un fallo de `.../exportar/` (errores de campo DRF que
 * `extractErrorMessage` no ve). Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const networkError = (): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Network Error", "ERR_NETWORK", config);
};

test.describe("slugifyFileNamePart (espejo del slugify de Django)", () => {
  test("minúsculas, sin acentos ni símbolos, espacios y guiones como un solo guion", () => {
    expect(slugifyFileNamePart("ALM-00")).toBe("alm-00");
    expect(slugifyFileNamePart("ENTRADA")).toBe("entrada");
    expect(slugifyFileNamePart("Almacén  Núm. 2")).toBe("almacen-num-2");
    expect(slugifyFileNamePart("PT / Matriz")).toBe("pt-matriz");
    expect(slugifyFileNamePart("--A_B--")).toBe("a_b");
  });
});

test.describe("stockReportFileName", () => {
  const base = { almacenId: 7, fechaInicio: "2026-11-01", fechaFinal: "2026-11-09" } as const;

  test("mismo nombre que el backend: código del almacén y rango con -a-", () => {
    expect(stockReportFileName({ ...base, codigo: "ALM-00", formato: "pdf" })).toBe(
      "reporte-existencias-alm-00-2026-11-01-a-2026-11-09.pdf",
    );
    expect(stockReportFileName({ ...base, codigo: "ALM-00", formato: "xlsx" })).toBe(
      "reporte-existencias-alm-00-2026-11-01-a-2026-11-09.xlsx",
    );
  });

  test("sin código conocido (o que se queda vacío) usa almacen-{id}, como el backend", () => {
    expect(stockReportFileName({ ...base, codigo: undefined, formato: "pdf" })).toBe(
      "reporte-existencias-almacen-7-2026-11-01-a-2026-11-09.pdf",
    );
    expect(stockReportFileName({ ...base, codigo: "＠＠", formato: "pdf" })).toBe(
      "reporte-existencias-almacen-7-2026-11-01-a-2026-11-09.pdf",
    );
  });
});

test.describe("stockMovementReportFileName", () => {
  const base = { fechaInicio: "2026-11-01", fechaFinal: "2026-11-09" } as const;

  test("tipo en minúsculas y código del almacén", () => {
    expect(
      stockMovementReportFileName({
        ...base,
        tipoMovimiento: "TRANSFERENCIA",
        almacenId: 3,
        codigo: "ALM-01",
        formato: "xlsx",
      }),
    ).toBe("reporte-movimientos-transferencia-alm-01-2026-11-01-a-2026-11-09.xlsx");
  });

  test("sin almacén: todos (aunque llegue un código)", () => {
    expect(
      stockMovementReportFileName({
        ...base,
        tipoMovimiento: "ENTRADA",
        almacenId: undefined,
        codigo: "ALM-01",
        formato: "pdf",
      }),
    ).toBe("reporte-movimientos-entrada-todos-2026-11-01-a-2026-11-09.pdf");
    expect(
      stockMovementReportFileName({
        ...base,
        tipoMovimiento: "AJUSTE",
        almacenId: null,
        codigo: null,
        formato: "pdf",
      }),
    ).toBe("reporte-movimientos-ajuste-todos-2026-11-01-a-2026-11-09.pdf");
  });
});

test.describe("stockReportExportErrorMessage", () => {
  const ALMACEN = "almacen es requerido para exportar el reporte de existencias.";

  test("400 de campo DRF: el motivo del backend tal cual, como string o lista", () => {
    expect(stockReportExportErrorMessage(httpError(400, { almacen: ALMACEN }), "pdf")).toBe(ALMACEN);
    expect(
      stockReportExportErrorMessage(
        httpError(400, { fecha_final: ["fecha_final no puede ser menor a fecha_inicio."] }),
        "xlsx",
      ),
    ).toBe("fecha_final no puede ser menor a fecha_inicio.");
    expect(stockReportExportErrorMessage(httpError(400, { formato: "Usa pdf o xlsx." }), "pdf")).toBe(
      "Usa pdf o xlsx.",
    );
    expect(
      stockReportExportErrorMessage(
        httpError(400, {
          tipo_movimiento: "tipo_movimiento es requerido y debe ser ENTRADA, SALIDA, AJUSTE o TRANSFERENCIA.",
        }),
        "pdf",
      ),
    ).toBe("tipo_movimiento es requerido y debe ser ENTRADA, SALIDA, AJUSTE o TRANSFERENCIA.");
  });

  test("non_field_errors y detail ganan a un campo; un mensaje en blanco se salta", () => {
    expect(
      stockReportExportErrorMessage(
        httpError(400, { almacen: ALMACEN, non_field_errors: ["Periodo inválido."] }),
        "pdf",
      ),
    ).toBe("Periodo inválido.");
    expect(
      stockReportExportErrorMessage(httpError(400, { fecha_inicio: "  ", almacen: ALMACEN }), "pdf"),
    ).toBe(ALMACEN);
  });

  test("una clave desconocida con mensaje también se muestra", () => {
    expect(stockReportExportErrorMessage(httpError(400, { producto: ["No existe."] }), "pdf")).toBe(
      "No existe.",
    );
  });

  test("403 con detail lo muestra; sin detail, el aviso de permiso", () => {
    expect(
      stockReportExportErrorMessage(httpError(403, { detail: "No tienes permiso." }), "pdf"),
    ).toBe("No tienes permiso.");
    expect(stockReportExportErrorMessage(httpError(403, {}), "pdf")).toBe(
      "No tienes permiso para descargar este reporte.",
    );
  });

  test("5xx, sin respuesta o sin cuerpo legible: mensajes en español, nunca el de Axios", () => {
    expect(stockReportExportErrorMessage(httpError(500, undefined), "pdf")).toBe(
      "El servidor no pudo generar el reporte. Intenta de nuevo en unos momentos.",
    );
    expect(stockReportExportErrorMessage(networkError(), "xlsx")).toBe(
      "No se pudo conectar con el servidor para generar el reporte. Revisa tu conexión e intenta de nuevo.",
    );
    expect(stockReportExportErrorMessage(httpError(400, undefined), "xlsx")).toBe(
      "No se pudo descargar el reporte en Excel.",
    );
    expect(stockReportExportErrorMessage(httpError(400, "texto suelto"), "pdf")).toBe(
      "No se pudo descargar el reporte en PDF.",
    );
  });

  test("un error que no es de Axios conserva su mensaje", () => {
    expect(stockReportExportErrorMessage(new Error("Falló la descarga."), "pdf")).toBe(
      "Falló la descarga.",
    );
    expect(stockReportExportErrorMessage("raro", "pdf")).toBe("No se pudo descargar el reporte en PDF.");
  });
});
