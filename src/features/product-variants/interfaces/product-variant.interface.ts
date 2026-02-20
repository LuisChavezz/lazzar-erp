import { Color } from "../../colors/interfaces/color.interface"
import { Product } from "../../products/interfaces/product.interface";
import { Size } from "../../sizes/interfaces/size.interface"


export interface ProductVariant {
  id: number;
  producto_id: Product["id"];
  empresa_id: number;
  color_id: Color["id"];
  talla_id: Size["id"];
  sku: string;
  precio_base: string;
  activo: boolean;
}
