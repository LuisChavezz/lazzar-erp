import { v1_api } from "@/src/api/v1.api";
import { Location, LocationCreate } from "@/src/features/locations/interfaces/location.interface";


export const getLocations = async (): Promise<Location[]> => {
  const { data } = await v1_api.get<Location[]>("/inventarios/ubicaciones/");
  return data;
};

export const createLocation = async (location: LocationCreate): Promise<Location> => {
  const { data } = await v1_api.post<Location>("/inventarios/ubicaciones/", location);
  return data;
};

export const updateLocation = async (id: number, location: LocationCreate): Promise<Location> => {
  const { data } = await v1_api.put<Location>(`/inventarios/ubicaciones/${id}/`, location);
  return data;
};

export const deleteLocation = async (id: number): Promise<void> => {
  await v1_api.delete(`/inventarios/ubicaciones/${id}/`);
};