import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  reportExportMutationKey,
  reportExportMutationOptions,
} from "@/src/features/stock/hooks/useReportExport";
import { exportStockReport } from "@/src/features/stock/services/actions";
import {
  fileNameFromContentDisposition,
  type ReportFile,
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

  test("detail y non_field_errors ganan a un campo (orden de firstDrfFieldMessage)", () => {
    expect(
      stockReportExportErrorMessage(
        httpError(400, { almacen: ALMACEN, non_field_errors: ["Periodo inválido."] }),
        "pdf",
      ),
    ).toBe("Periodo inválido.");
    expect(
      stockReportExportErrorMessage(httpError(400, { almacen: ALMACEN, detail: "Filtro inválido." }), "pdf"),
    ).toBe("Filtro inválido.");
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

  test("5xx con motivo en el cuerpo (detail o error) lo muestra", () => {
    expect(
      stockReportExportErrorMessage(httpError(503, { detail: "Servicio en mantenimiento." }), "pdf"),
    ).toBe("Servicio en mantenimiento.");
    expect(
      stockReportExportErrorMessage(httpError(500, { error: "No se pudo renderizar el PDF." }), "pdf"),
    ).toBe("No se pudo renderizar el PDF.");
  });

  test("403 con un campo suelto no lo muestra: solo detail (regla del 403)", () => {
    expect(stockReportExportErrorMessage(httpError(403, { almacen: ["x"] }), "pdf")).toBe(
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

test.describe("fileNameFromContentDisposition", () => {
  test("filename= con y sin comillas, tal como lo manda el backend", () => {
    expect(
      fileNameFromContentDisposition(
        'attachment; filename="reporte-existencias-alm-02-2026-10-01-a-2026-11-09.pdf"',
      ),
    ).toBe("reporte-existencias-alm-02-2026-10-01-a-2026-11-09.pdf");
    expect(fileNameFromContentDisposition("attachment; filename=reporte.xlsx")).toBe("reporte.xlsx");
    expect(fileNameFromContentDisposition('attachment; filename="con \\"comillas\\".pdf"')).toBe(
      'con "comillas".pdf',
    );
  });

  test("filename*=UTF-8'' gana a filename= y se decodifica", () => {
    expect(
      fileNameFromContentDisposition(
        "attachment; filename=\"reporte.pdf\"; filename*=UTF-8''reporte-almac%C3%A9n%20norte.pdf",
      ),
    ).toBe("reporte-almacén norte.pdf");
  });

  test("filename* ilegible o con otra codificación: cae a filename=", () => {
    expect(
      fileNameFromContentDisposition("attachment; filename*=UTF-8''mal%E0%A4.pdf; filename=\"bien.pdf\""),
    ).toBe("bien.pdf");
    expect(
      fileNameFromContentDisposition("attachment; filename*=ISO-8859-1''x%E9.pdf; filename=bien.pdf"),
    ).toBe("bien.pdf");
  });

  test("sin cabecera o sin nombre usable: undefined (se usa el de respaldo)", () => {
    expect(fileNameFromContentDisposition(undefined)).toBeUndefined();
    expect(fileNameFromContentDisposition("")).toBeUndefined();
    expect(fileNameFromContentDisposition("attachment")).toBeUndefined();
    expect(fileNameFromContentDisposition('attachment; filename=""')).toBeUndefined();
    expect(fileNameFromContentDisposition('attachment; filename=".."')).toBeUndefined();
  });

  test("nunca devuelve carpetas", () => {
    expect(fileNameFromContentDisposition('attachment; filename="../../etc/reporte.pdf"')).toBe("reporte.pdf");
    expect(fileNameFromContentDisposition("attachment; filename=C:\\tmp\\reporte.pdf")).toBe("reporte.pdf");
  });
});

/**
 * Mutación de UNA descarga con un `QueryClient` real, como la arma
 * `useReportExport`: nombre del archivo, candado por filtros y camino de error
 * con el cuerpo en Blob. `downloadBlob` se sustituye (no hay DOM).
 */
test.describe("reportExportMutationOptions", () => {
  const PARAMS_A = { almacen_id: 2, fecha_inicio: "2026-10-01", fecha_final: "2026-11-09" };
  const PARAMS_B = { ...PARAMS_A, almacen_id: 5 };
  const FALLBACK = "reporte-existencias-alm-02-2026-10-01-a-2026-11-09.pdf";
  const blob = new Blob(["%PDF-"], { type: "application/pdf" });

  const run = async (file: ReportFile) => {
    const downloads: string[] = [];
    const observer = new MutationObserver(
      new QueryClient(),
      reportExportMutationOptions({
        report: "stock-report",
        formato: "pdf",
        params: PARAMS_A,
        request: async () => file,
        download: (_blob, name) => {
          downloads.push(name);
        },
      }),
    );
    const fileName = await observer.mutate({ params: PARAMS_A, fallbackFileName: FALLBACK });
    toast.remove();
    return { fileName, downloads };
  };

  test("sin Content-Disposition legible usa el nombre de respaldo", async () => {
    expect(await run({ blob, contentDisposition: undefined })).toEqual({
      fileName: FALLBACK,
      downloads: [FALLBACK],
    });
  });

  test("con Content-Disposition usa el nombre del backend", async () => {
    expect(await run({ blob, contentDisposition: 'attachment; filename="del-backend.pdf"' })).toEqual({
      fileName: "del-backend.pdf",
      downloads: ["del-backend.pdf"],
    });
  });

  test("candado: los mismos filtros quedan ocupados al instante; otros filtros no", async () => {
    // Diferido creado ANTES: TanStack llama a la petición tras un microtask.
    let release: (file: ReportFile) => void = () => undefined;
    const response = new Promise<ReportFile>((resolve) => {
      release = resolve;
    });
    const queryClient = new QueryClient();
    const observer = new MutationObserver(
      queryClient,
      reportExportMutationOptions({
        report: "stock-report",
        formato: "pdf",
        params: PARAMS_A,
        request: () => response,
        download: () => undefined,
      }),
    );
    const isBusy = (key: readonly unknown[]) =>
      queryClient.isMutating({ mutationKey: key, exact: true }) > 0;

    const pending = observer.mutate({ params: PARAMS_A, fallbackFileName: FALLBACK });
    // Síncrono, sin esperar: es lo que ve el segundo clic de un doble clic.
    expect(isBusy(reportExportMutationKey("stock-report", "pdf", PARAMS_A))).toBe(true);
    // Mismos filtros con otro orden de propiedades: la misma descarga.
    expect(
      isBusy(
        reportExportMutationKey("stock-report", "pdf", {
          fecha_final: "2026-11-09",
          fecha_inicio: "2026-10-01",
          almacen_id: 2,
        }),
      ),
    ).toBe(true);
    // Otro almacén, el otro formato u otro reporte: libres.
    expect(isBusy(reportExportMutationKey("stock-report", "pdf", PARAMS_B))).toBe(false);
    expect(isBusy(reportExportMutationKey("stock-report", "xlsx", PARAMS_A))).toBe(false);
    expect(isBusy(reportExportMutationKey("stock-movement-report", "pdf", PARAMS_A))).toBe(false);

    release({ blob, contentDisposition: undefined });
    await pending;
    toast.remove();
    expect(isBusy(reportExportMutationKey("stock-report", "pdf", PARAMS_A))).toBe(false);
  });

  test("un almacén undefined (todos los almacenes) cuenta como ausente en la llave", () => {
    const queryClient = new QueryClient();
    const base = { tipo_movimiento: "ENTRADA", fecha_inicio: "2026-10-01", fecha_final: "2026-11-09" };
    const observer = new MutationObserver(
      queryClient,
      reportExportMutationOptions({
        report: "stock-movement-report",
        formato: "xlsx",
        params: { ...base, almacen_id: undefined },
        request: () => new Promise<ReportFile>(() => undefined),
        download: () => undefined,
      }),
    );
    void observer.mutate({ params: { ...base, almacen_id: undefined }, fallbackFileName: "x.xlsx" });
    expect(
      queryClient.isMutating({
        mutationKey: reportExportMutationKey("stock-movement-report", "xlsx", base),
        exact: true,
      }),
    ).toBe(1);
  });

  test("error con cuerpo JSON en Blob: llega el motivo del backend, no el genérico", async () => {
    const MESSAGE = "almacen es requerido para exportar el reporte de existencias.";
    const { v1_api } = await import("@/src/api/v1.api");
    const originalGet = v1_api.get;
    const calls: { url: string; config: unknown }[] = [];
    v1_api.get = (async (url: string, config?: unknown) => {
      calls.push({ url, config });
      const body = new Blob([JSON.stringify({ almacen: MESSAGE })], { type: "application/json" });
      throw httpError(400, body);
    }) as typeof v1_api.get;

    let caught: unknown;
    try {
      const observer = new MutationObserver(
        new QueryClient(),
        reportExportMutationOptions({
          report: "stock-report",
          formato: "xlsx",
          params: PARAMS_A,
          request: exportStockReport,
          download: () => undefined,
        }),
      );
      await observer.mutate({ params: PARAMS_A, fallbackFileName: "x.xlsx" }).catch((error: unknown) => {
        caught = error;
      });
    } finally {
      v1_api.get = originalGet;
      toast.remove();
    }

    expect(calls).toEqual([
      {
        url: "/inventarios/existencias/reporte-existencias-periodo/exportar/",
        config: { params: { ...PARAMS_A, formato: "xlsx" }, responseType: "blob" },
      },
    ]);
    expect(stockReportExportErrorMessage(caught, "xlsx")).toBe(MESSAGE);
  });
});
