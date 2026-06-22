import { ProductCategory } from "../../product-categories/interfaces/product-category.interface";
import { ProductType } from "../../product-types/interfaces/product-type.interface";
import { SatProdservCode } from "../../sat-prodserv-codes/interfaces/sat-prodserv-code.interface";
import { SatUnitCode } from "../../sat-unit-codes/interfaces/sat-unit-code.interface";
import { Tax } from "../../taxes/interfaces/tax.interface";
import { UnitOfMeasure } from "../../units-of-measure/interfaces/unit-of-measure.interface";


export interface Product {
  id: number;
  empresa: number;
  categoria_producto: ProductCategory["id"];
  unidad_medida: UnitOfMeasure["id"] | null;
  impuesto: Tax["id"] | null;
  sat_prodserv: SatProdservCode["id_sat_prodserv"] | null;
  sat_unidad: SatUnitCode["id_sat_unidad"] | null;
  nombre: string;
  descripcion: string | null;
  tipo: ProductType["codigo"];
  precio_base: string;
  cod_proscai: string;
  codigo: string;
  activo: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ProductCreate {
  empresa: number;
  categoria_producto: ProductCategory["id"];
  unidad_medida: UnitOfMeasure["id"];
  impuesto: Tax["id"];
  sat_prodserv: SatProdservCode["id_sat_prodserv"];
  sat_unidad: SatUnitCode["id_sat_unidad"];
  nombre: string;
  descripcion: string;
  tipo: ProductType["codigo"];
  precio_base: number;
  activo: boolean;
}
