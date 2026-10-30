import { Company } from "../../companies/interfaces/company.interface";


export interface ProductCategory {
  id: number;
  empresa: Company["id"];
  nombre: string;
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
  codigo: string;
  descripcion: string;
}