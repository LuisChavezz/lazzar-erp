import { Company } from "../interfaces/company.interface";
import { v1_api } from "@/src/api/v1.api";
import type { MfaLoginUser } from "@/src/features/auth/interfaces/auth.interface";

/**
 * Empresas del usuario autenticado.
 *
 * La alimenta `useMyCompanies`, que consume el selector de workspace. El CRUD
 * de empresas (`getCompanies`/`registerCompany`/`updateCompany`/
 * `deleteCompany` sobre `/nucleo/empresas/`) se eliminó junto con
 * `CompanyList`, la pantalla de /config que era su único consumidor y que ya
 * no tenía tarjeta que la alcanzara.
 */
export const getMyCompanies = async (): Promise<Company[]> => {
  const response = await v1_api.get("/nucleo/mis-empresas/");
  return response.data;
};

/**
 * Cambia la empresa activa del superusuario (`POST /nucleo/cambiar-empresa/`,
 * EC-843). Solo `is_superuser` (403 para cualquier otro); destino: cualquier
 * empresa activa (400 `{"empresa":["Empresa no válida."]}` si no). Pedir la
 * actual responde 200 sin cambios.
 *
 * Responde lo mismo que `GET /api/auth/user/`. El backend guarda el cambio en
 * el usuario (todas sus sesiones), reinicia `sucursal_default` y vacía
 * `sucursales` y `departamentos`; no reemite el JWT: la siguiente petición ya
 * opera en la empresa nueva.
 */
export const switchActiveCompany = async (empresa: number): Promise<MfaLoginUser> => {
  const response = await v1_api.post<MfaLoginUser>("/nucleo/cambiar-empresa/", { empresa });
  return response.data;
};
