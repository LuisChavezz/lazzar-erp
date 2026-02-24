import { v1_api } from "@/src/api/v1.api";
import { Warehouse, WarehouseCreate } from "../interfaces/warehouse.interface";

export const getWarehouses = async (): Promise<Warehouse[]> => {
  const response = await v1_api.get("/inventarios/almacenes/");

  return response.data;
};

export const createWarehouse = async (warehouse: WarehouseCreate): Promise<Warehouse> => {
  const response = await v1_api.post("/inventarios/almacenes/", warehouse);

  return response.data;
};

export const updateWarehouse = async (id: number, warehouse: WarehouseCreate): Promise<Warehouse> => {
  const response = await v1_api.put(`/inventarios/almacenes/${id}/`, warehouse);

  return response.data;
};

export const deleteWarehouse = async (id: number): Promise<void> => {
  await v1_api.delete(`/inventarios/almacenes/${id}/`);
};