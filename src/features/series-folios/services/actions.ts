import { v1_api } from "@/src/api/v1.api";
import { SerieFolio, SerieFolioCreate } from "../interfaces/serie-folio.interface";


export const getSerieFolios = async ():Promise<SerieFolio[]> => {
  const { data } = await v1_api.get<SerieFolio[]>("/nucleo/series-folios/");
  return data;
}

export const createSerieFolio = async (serieFolio: SerieFolioCreate):Promise<SerieFolio> => {
  const { data } = await v1_api.post<SerieFolio>("/nucleo/series-folios/", serieFolio);
  return data;
}

export const updateSerieFolio = async (serieFolio: SerieFolio):Promise<SerieFolio> => {
  const { data } = await v1_api.put<SerieFolio>(`/nucleo/series-folios/${serieFolio.id_serie_folio}`, serieFolio);
  return data;
}

export const deleteSerieFolio = async (serieFolio: SerieFolio):Promise<void> => {
  await v1_api.delete<void>(`/nucleo/series-folios/${serieFolio.id_serie_folio}`);
}