import { Color } from "../../colors/interfaces/color.interface";
import { Company } from "../../companies/interfaces/company.interface";
import { Product } from "../../products/interfaces/product.interface";
import { Size } from "../../sizes/interfaces/size.interface";

export interface ProductVariant {
  id: number;
  producto: Product["id"];
  empresa: Company["id"];
  color: Color["id"];
  talla: Size["id"];
  sku: string;
  precio_base: string;
  activo: boolean;
}

export interface ProductVariantCreate {
  producto: Product["id"];
  empresa: Company["id"];
  color: Color["id"];
  talla: Size["id"];
  sku: string;
  precio_base: string;
  activo: boolean;
}
