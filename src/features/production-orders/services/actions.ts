import { v1_api } from "@/src/api/v1.api";
import {
  ProductionOrderOnboarding,
  CreateProductionOrderBody,
  CreateProductionOrderResponse,
  ProductionOrderListItem,
} from "@/src/features/production-orders/interfaces/production-order.interface";


export const getProductionOrderOnboarding = async (
  op_id: number
): Promise<ProductionOrderOnboarding> => {
  const response = await v1_api.get<ProductionOrderOnboarding>(
    "/produccion/orden-produccion/onboarding/",
    { params: { op_id } }
  );
  return response.data;
};

export const createProductionOrderOnboarding = async (
  body: CreateProductionOrderBody
): Promise<CreateProductionOrderResponse> => {
  const response = await v1_api.post<CreateProductionOrderResponse>(
    "/produccion/orden-produccion/onboarding/",
    body
  );
  return response.data;
};

export const getProductionOrders = async (): Promise<ProductionOrderListItem[]> => {
  const response = await v1_api.get<ProductionOrderListItem[]>('/produccion/orden-produccion/');
  return response.data;
};
