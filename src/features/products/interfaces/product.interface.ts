import { ProductCategory } from "../../product-categories/interfaces/product-category.interface";
import { ProductType } from "../../product-types/interfaces/product-type.interface";
import { SatProdservCode } from "../../sat-prodserv-codes/interfaces/sat-prodserv-code.interface";
import { SatUnitCode } from "../../sat-unit-codes/interfaces/sat-unit-code.interface";
import { Tax } from "../../taxes/interfaces/tax.interface";
import { UnitOfMeasure } from "../../units-of-measure/interfaces/unit-of-measure.interface";

export interface Product {
  id: number;
  empresa_id: number;
  categoria_producto_id: ProductCategory["id"];
  unidad_medida_id: UnitOfMeasure["id"];
  impuesto_id: Tax["id"];
  sat_prodserv_id: SatProdservCode["id_sat_prodserv"];
  sat_unidad_id: SatUnitCode["id_sat_unidad"];
  nombre: string;
  descripcion: string;
  tipo: ProductType["id"];
  activo: boolean;
  created_at: string;
  updated_at: string;
}