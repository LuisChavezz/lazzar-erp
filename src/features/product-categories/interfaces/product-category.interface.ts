import { Company } from "../../companies/interfaces/company.interface";
import type { CategoriaLineaValue } from "../constants/categoriaLinea";


export interface ProductCategory {
  id: number;
  empresa: Company["id"];
  nombre: string;
  /** Línea comercial; `""` = materia prima. Ver `CATEGORIA_LINEA_CONFIG`. */
  linea: CategoriaLineaValue;
  codigo: string;
  descripcion: string;
  /**
   * Ids de las `Talla` permitidas (M2M de solo lectura en el serializer). Vacío
   * = la categoría no acota tallas: el backend acepta cualquiera.
   */
  tallas: number[];
}

export interface ProductCategoryCreate {
  empresa: Company["id"];
  nombre: string;
  /** `""` deja la categoría sin línea (materia prima). */
  linea: CategoriaLineaValue;
  codigo: string;
  descripcion: string;
}