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
  /**
   * PK de `TipoProducto` (FK en el modelo), NO su `codigo`. Nullable: hay
   * productos importados sin tipo.
   */
  tipo: ProductType["id"] | null;
  precio_base: string;
  cod_proscai: string;
  /** Lo asigna el alta rápida; un producto dado de alta por otra vía puede no tenerlo. */
  codigo: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string | null;
}

/**
 * Cuerpo de `PUT /catalogo/producto/{id}/`. Los catálogos fiscales viajan
 * `null` cuando el producto no los tiene (ver `createProductEditSchema`).
 *
 * Fuera a propósito:
 *  - `empresa`: el serializer la marca `read_only` y la descartaría en silencio.
 *  - `tipo`: es de solo lectura en la edición. `ProductoRequest` no lo exige, y
 *    un PUT que lo omite conserva el valor guardado (verificado contra el
 *    backend); mandarlo, aunque fuera sin cambios, podría pisar un tipo que
 *    alguien cambió después de abrir el formulario.
 *  - `codigo`: lo asigna el alta rápida; omitirlo también lo conserva.
 */
export interface ProductUpdate {
  categoria_producto: ProductCategory["id"];
  unidad_medida: UnitOfMeasure["id"] | null;
  impuesto: Tax["id"] | null;
  sat_prodserv: SatProdservCode["id_sat_prodserv"] | null;
  sat_unidad: SatUnitCode["id_sat_unidad"] | null;
  nombre: string;
  descripcion: string;
  precio_base: number;
  activo: boolean;
}
