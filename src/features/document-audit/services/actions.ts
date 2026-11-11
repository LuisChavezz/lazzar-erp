import { v1_api } from "@/src/api/v1.api";
import type {
  BitacoraDocumento,
  BitacoraDocumentoPage,
} from "../interfaces/document-audit.interface";

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
 * Historia de un documento y de los que lo tienen como origen directo, en
 * orden cronológico (máximo 500, los más antiguos). Un id inexistente o de otra
 * empresa responde `200 []`.
 */
export const getDocumentTimeline = async (
  tipo: string,
  documentoId: number,
  signal?: AbortSignal,
): Promise<BitacoraDocumento[]> => {
  const { data } = await v1_api.get<BitacoraDocumento[]>("/auditoria/documentos/linea-tiempo/", {
    params: { tipo, documento_id: documentoId },
    signal,
  });
  return data;
};
