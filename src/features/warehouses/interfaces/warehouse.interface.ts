import { Branch } from "../../branches/interfaces/branch.interface"
import { Company } from "../../companies/interfaces/company.interface"


export interface Warehouse {
  id_almacen: number;
  empresa: Company["id"];
  sucursal: Branch["id"];
  codigo: string;
  nombre: string;
  estatus: WarehouseStatus;
  created_at: string;
  updated_at: string;
}

export interface WarehouseCreate {
  sucursal: Branch["id"];
  codigo: string;
  nombre: string;
  estatus: WarehouseStatus;
}

type WarehouseStatus = "ACTIVO" | "INACTIVO"
