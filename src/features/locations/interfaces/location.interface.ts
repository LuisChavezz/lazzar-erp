import { Branch } from "../../branches/interfaces/branch.interface"
import { Company } from "../../companies/interfaces/company.interface"
import { Warehouse } from "../../warehouses/interfaces/warehouse.interface";


export interface Location {
  id_ubicacion: number;
  empresa: Company["id"];
  sucursal: Branch["id"];
  almacen: Warehouse["id_almacen"];
  codigo: string;
  nombre: string;
  estatus: string;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  almacen: Warehouse["id_almacen"];
  codigo: string;
  nombre: string;
  estatus: string;
}
