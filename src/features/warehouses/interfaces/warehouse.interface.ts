import { Branch } from "../../branches/interfaces/branch.interface"
import { Company } from "../../companies/interfaces/company.interface"


export interface Warehouse {
  id_almacen: number;
  empresa: Company["id"];
  sucursal: Branch["id"];
  codigo: string;
  nombre: string;
  estatus: WarehouseStatus;
  /**
   * El almacén acepta entradas de inventario. De solo lectura en este endpoint
   * (no se edita desde el catálogo); lo usa el selector del traslado de
   * picking, porque el backend rechaza un almacén nuevo que no lo permita.
   */
  permite_entrada: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseCreate {
  sucursal: Branch["id"];
  codigo: string;
  nombre: string;
}

type WarehouseStatus = "ACTIVO" | "INACTIVO"
