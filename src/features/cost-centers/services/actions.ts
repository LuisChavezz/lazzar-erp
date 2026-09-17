import { v1_api } from "@/src/api/v1.api";
import type {
  CostCenter,
  CostCenterCreate,
  CostCenterQueryParams,
} from "../interfaces/cost-center.interface";

/**
 * Catálogo de centros de costo: `GET /finanzas/centros-costo/`.
 *
 * Devuelve un ARREGLO PLANO, sin envoltorio de paginación (ver `CostCenter`). El
 * backend ya acota los resultados a la empresa del usuario autenticado, así que
 * no hace falta filtrar por empresa en el cliente.
 *
 * Los parámetros son opcionales y Axios OMITE las llaves `undefined`, que es
 * justo lo que hace falta para `activo`: el backend lee `?activo=` con cualquier
 * valor no verdadero —el vacío incluido— como "solo los inactivos", así que
 * pedir el catálogo completo es NO mandar la llave. Por eso `params` viaja tal
 * cual y nunca se normaliza a `{ activo: "" }`.
 *
 * NO hay acción de "retrieve": el ViewSet declara un único `serializer_class`,
 * así que la fila del listado trae exactamente lo mismo que devolvería
 * `/{id}/` y el diálogo de detalle se arma con ella (ver
 * `CostCenterDetailDialog`).
 */
export const getCostCenters = async (
  params?: CostCenterQueryParams,
): Promise<CostCenter[]> => {
  const { data } = await v1_api.get<CostCenter[]>("/finanzas/centros-costo/", {
    params,
  });
  return data;
};

/**
 * Alta de un centro de costo.
 *
 * El cuerpo NO lleva `empresa` (la resuelve el backend) ni `activo` (nace en
 * `true`). El error se deja propagar tal cual para que el hook reparta los
 * errores de campo del 400 —en particular el de `codigo` duplicado—.
 */
export const createCostCenter = async (
  centro: CostCenterCreate,
): Promise<CostCenter> => {
  const { data } = await v1_api.post<CostCenter>(
    "/finanzas/centros-costo/",
    centro,
  );
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT.
 *
 * Es lo que CONSERVA `activo`: con PUT, lo ausente del cuerpo se reemplazaría y
 * un centro dado de baja volvería a su default al guardar el formulario; con
 * PATCH, lo que no se envía no se toca. Por eso el payload es el mismo tipo del
 * alta y `activo` no aparece en él.
 */
export const updateCostCenter = async (
  id: number,
  centro: CostCenterCreate,
): Promise<CostCenter> => {
  const { data } = await v1_api.patch<CostCenter>(
    `/finanzas/centros-costo/${id}/`,
    centro,
  );
  return data;
};

/**
 * Da de baja o reactiva un centro de costo.
 *
 * Es el ÚNICO control de ciclo de vida que expone esta pantalla, y cubre las dos
 * direcciones con un solo verbo. El `DELETE` del endpoint hace exactamente lo
 * mismo que `PATCH { activo: false }` —es una baja LÓGICA: la fila permanece y
 * sigue llegando en el GET por defecto—, así que ofrecer ambos sería presentar
 * dos acciones para un solo efecto, una de ellas con un nombre que promete un
 * borrado que no ocurre. La UI no llama nunca al DELETE.
 *
 * REACTIVAR PUEDE FALLAR CON 400: la unicidad del código se valida solo entre
 * los ACTIVOS, así que mientras el centro estuvo de baja otro pudo tomar su
 * código. El backend responde `{"codigo": [...]}` con un mensaje legible; el
 * hook lo muestra tal cual (ver `useToggleCostCenterActivo`). No se comprueba
 * desde el cliente: la fuente de verdad es el backend y cualquier verificación
 * previa sería una carrera.
 */
export const setCostCenterActivo = async (
  id: number,
  activo: boolean,
): Promise<CostCenter> => {
  const { data } = await v1_api.patch<CostCenter>(
    `/finanzas/centros-costo/${id}/`,
    { activo },
  );
  return data;
};
