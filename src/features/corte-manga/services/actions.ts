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
 * `list` usa `OrdenesCorteMangaListSerializer`: renglones LIGEROS
 * (`OrdenCorteMangaDetalleListSerializer`, sin
 * `corte_manga_config`/`ubicaciones`/`foto`/`notas`) y sin `pedido_vinculado`.
 * El detalle por id trae ambas cosas — ver `getCorteMangaOrderDetail`.
 */
export const getCorteMangaOrders = async (): Promise<CorteMangaOrder[]> => {
  const response = await v1_api.get<CorteMangaOrder[]>(
    "/produccion/orden-corte-manga/",
  );
  return response.data;
};

/**
 * Detalle de UNA orden de corte de manga
 * (`GET /produccion/orden-corte-manga/{id}/`).
 *
 * `retrieve` usa `OrdenesCorteMangaRetrieveSerializer`: es un superconjunto del
 * renglón del listado —añade `pedido_vinculado` y devuelve los renglones
 * COMPLETOS (`corte_manga_config`/`ubicaciones`/`foto`/`notas`)—, así que el
 * tipo de retorno sigue siendo `CorteMangaOrder`, con `pedido_vinculado`
 * declarado OPCIONAL por ser el único campo que distingue las dos acciones. No
 * hace falta un tipo de detalle aparte como en bordado/reflejante.
 *
 * Lo consumen la página de detalle (`CorteMangaOrderPageContent`) y el
 * envoltorio por id del diálogo (`CorteMangaOrderDetailByIdDialog`, que usa la
 * sección "Documentos relacionados" del detalle de pedido), ambos vía
 * `useCorteMangaOrderDetail`.
 *
 * Fuera de alcance (otra empresa/sucursal) responde `404`, no `403`: el
 * `get_queryset()` acotado por tenant es el mismo del listado, así que un id
 * ajeno no se distingue de uno inexistente.
 */
export const getCorteMangaOrderDetail = async (
  id: number,
): Promise<CorteMangaOrder> => {
  const response = await v1_api.get<CorteMangaOrder>(
    `/produccion/orden-corte-manga/${id}/`,
  );
  return response.data;
};

/**
 * Catálogos para dar de alta una orden de corte de manga
 * (`GET /produccion/orden-corte-manga/onboarding/`).
 *
 * SIN parámetros: este onboarding no tiene un segundo modo con alcance al padre
 * elegido (`?pedido=`) como picking/packing/envío — el service deriva los
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
