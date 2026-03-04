import { Branch } from "../../branches/interfaces/branch.interface"
import { Company } from "../../companies/interfaces/company.interface"
import { Warehouse } from "../../warehouses/interfaces/warehouse.interface";


export interface Location {
  id_ubicacion: number;
  empresa: Company["id"];
  sucursal: Branch["id"];
  almacen: Warehouse["id_almacen"];
  pasillo: string;
  rack: string;
  estatus: LocationStatus;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  almacen: Warehouse["id_almacen"];
  pasillo: string;
  rack: string;
  estatus: LocationStatus;
}

type LocationStatus = "ACTIVO" | "INACTIVO"