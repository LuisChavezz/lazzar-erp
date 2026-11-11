import { v1_api } from "@/src/api/v1.api";
import type {
  BitacoraDocumentoPage,
  BitacoraLineaTiempo,
} from "../interfaces/document-audit.interface";
import { documentTimelineResponseSchema } from "../schemas/documentTimeline.schema";

/** Eventos por página. El backend da 50 por defecto y acepta hasta 200 (`limit`). */
export const DOCUMENT_AUDIT_PAGE_SIZE = 50;

/**
 * Una página de la bitácora. `params` ya viene validado y sin vacíos
 * (`toDocumentAuditParams`); `cursor` es el de `extractAuditCursor`, o `null`
 * para la primera página. Nunca se envía `ordering` ni `search`.
 */
export const getDocumentAuditPage = async (
  params: Record<string, string>,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<BitacoraDocumentoPage> => {
  const { data } = await v1_api.get<BitacoraDocumentoPage>("/auditoria/documentos/", {
    params: {
      ...params,
      limit: DOCUMENT_AUDIT_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    },
    signal,
  });
  return data;
};

/**
 * Historia de un documento y de lo que deriva de él (en cadena: OC → recepción
 * → factura de proveedor, la transferencia de cada picking, los cobros de cada
 * factura…), en orden cronológico: los 500 más recientes, con `truncado` si
 * había más. Un documento que no existe en la empresa responde 404.
 *
 * Valida la forma AQUÍ: otra respuesta (p. ej. un arreglo) lanza un `ZodError`
 * y la hoja muestra un error de carga, nunca "sin eventos".
 */
export const getDocumentTimeline = async (
  tipo: string,
  documentoId: number,
  signal?: AbortSignal,
): Promise<BitacoraLineaTiempo> => {
  const { data } = await v1_api.get<unknown>("/auditoria/documentos/linea-tiempo/", {
    params: { tipo, documento_id: documentoId },
    signal,
  });
  return documentTimelineResponseSchema.parse(data);
};
