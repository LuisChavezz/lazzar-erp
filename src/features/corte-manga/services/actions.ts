import { v1_api } from "@/src/api/v1.api";
import type {
  CorteMangaOnboardingData,
  CorteMangaOrder,
  CreateCorteMangaOrderPayload,
} from "../interfaces/corte-manga-order.interface";

/**
 * Lista las órdenes de corte de manga
 * (`GET /produccion/orden-corte-manga/`).
 *
 * Tenant-scoped por empresa/sucursal — el usuario solo ve las órdenes de las
 * sucursales a las que tiene acceso (mismo criterio que bordado/reflejante/
 * picking; fuera de alcance devuelve `200 []`). Sin parámetros de filtro ni
 * paginación: el proyecto no configura `DEFAULT_PAGINATION_CLASS`, así que el
 * backend devuelve el arreglo COMPLETO (el esquema OpenAPI desplegado lo
 * confirma: la respuesta del listado es un `array` de `OrdenesCorteManga`, sin
 * envoltorio `count`/`results`, y el endpoint no declara ningún `parameters`).
 *
 * Igual que bordado y reflejante, el `queryset` ordena por `-fecha_inicio,
 * -id`, así que el arreglo llega ya en el orden de presentación (más reciente
 * primero) y el frontend no reordena nada (ver `useCorteMangaOrders`).
 *
 * NO existe un action de detalle (`GET /{id}/`) en este módulo, y es
 * deliberado: `retrieve` devuelve EXACTAMENTE el mismo objeto que un renglón de
 * este listado, así que el diálogo de detalle se arma con la fila ya cargada.
 * Ver `CorteMangaOrderDetailDialog` para la verificación campo por campo.
 */
export const getCorteMangaOrders = async (): Promise<CorteMangaOrder[]> => {
  const response = await v1_api.get<CorteMangaOrder[]>(
    "/produccion/orden-corte-manga/",
  );
  return response.data;
};

/**
 * Catálogos para dar de alta una orden de corte de manga
 * (`GET /produccion/orden-corte-manga/onboarding/`).
 *
 * SIN parámetros: este onboarding no tiene un segundo modo con alcance al padre
 * elegido (`?pedido=`) como picking/packing/despacho — el service deriva los
 * detalles solo en el POST, así que no hay nada que previsualizar por pedido.
 * Por eso basta una sola llamada y se cachea como catálogo normal.
 *
 * Fuera de alcance (sin empresa o sin sucursales permitidas) responde `200` con
 * los arreglos vacíos y `preview.folio_ocm_sugerido` en `null`, no un error.
 */
export const getCorteMangaOnboarding = async (): Promise<CorteMangaOnboardingData> => {
  const response = await v1_api.get<CorteMangaOnboardingData>(
    "/produccion/orden-corte-manga/onboarding/",
  );
  return response.data;
};

/**
 * Crea una orden de corte de manga
 * (`POST /produccion/orden-corte-manga/onboarding/`).
 *
 * Se usa la ruta `onboarding/` y NO el `POST /produccion/orden-corte-manga/` a
 * secas: comparten serializer y service —el mismo `OrdenCorteMangaService.save`
 * literal en ambas ramas del ViewSet—, pero el segundo responde `200` en vez
 * del `201` que corresponde a una creación (verificado en
 * `OrdenesCorteMangaViewSet.create`, que devuelve `status.HTTP_200_OK`; la
 * rama `onboarding` devuelve `status.HTTP_201_CREATED`). Misma decisión que en
 * reflejante.
 *
 * La respuesta trae la orden ya creada con el mismo shape del listado — de ahí
 * sale el `folio_ocm` REAL (el único válido para mostrarle al usuario, frente
 * al `folio_ocm_sugerido` aproximado del onboarding).
 *
 * Toda ruta de rechazo ocurre ANTES de `generate_ocm_folio` y el service es
 * `@transaction.atomic`: un error no consume folio ni deja renglones sueltos.
 */
export const createCorteMangaOrder = async (
  data: CreateCorteMangaOrderPayload,
): Promise<CorteMangaOrder> => {
  const response = await v1_api.post<CorteMangaOrder>(
    "/produccion/orden-corte-manga/onboarding/",
    data,
  );
  return response.data;
};
