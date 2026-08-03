import { v1_api } from "@/src/api/v1.api";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";

/**
 * Lista los eventos de impresión de etiquetas RFID (`GET /wms/etiquetas-rfid/`).
 *
 * Sin paginar y sin params de filtro documentados — el backend ya acota el
 * resultado a empresa/sucursal del usuario (`EtiquetaRFIDViewSet.get_queryset`).
 */
export const getEtiquetasRFID = async (): Promise<EtiquetaRFID[]> => {
  const response = await v1_api.get<EtiquetaRFID[]>("/wms/etiquetas-rfid/");
  return response.data;
};
