import { Company } from "../../companies/interfaces/company.interface";


export interface ProductCategory {
  id: number;
  empresa: Company["id"];
  nombre: string;
  codigo: string;
  descripcion: string;
}

export interface ProductCategoryCreate {
  empresa: Company["id"];
  nombre: string;
  codigo: string;
  descripcion: string;
}