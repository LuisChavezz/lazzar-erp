import { Location } from "../../locations/interfaces/location.interface"
import { Product } from "../../products/interfaces/product.interface"
import { Warehouse } from "../../warehouses/interfaces/warehouse.interface"


export interface StockItem {
  id: number;
  product: Product["id"];
  producto_info: Partial<Product>;
  almacen: Warehouse["id_almacen"];
  almacen_info: Partial<Warehouse>;
  ubicacion: Location["id_ubicacion"];
  ubicacion_info: Partial<Location>;
  lote: number;
  lote_info: Partial<Lote>;
  serie: number;
  serie_info: Partial<Serie>;
}

interface Lote {
  id: number;
  producto: Product["id"];
}

interface Serie {
  id: number;
  producto: Product["id"];
}
