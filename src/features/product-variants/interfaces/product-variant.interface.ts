import { Color } from "../../colors/interfaces/color.interface";
import { Company } from "../../companies/interfaces/company.interface";
import { Product } from "../../products/interfaces/product.interface";
import { Size } from "../../sizes/interfaces/size.interface";

export interface ProductVariant {
  nombre: string;
  id: number;
  producto: Product["id"];
  empresa: Company["id"];
  color: Color["id"];
  talla: Size["id"];
  sku: string;
  /** Código Proscai del producto padre (solo lectura; puede venir vacío). */
  cod_proscai: string;
  /** Nombres resueltos del producto, color y talla (solo lectura). */
  producto_nombre: string;
  color_nombre: string;
  talla_nombre: string;
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
