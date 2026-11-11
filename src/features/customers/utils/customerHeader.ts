import type { Customer } from "../interfaces/customer.interface";

/** "601 - General de Ley…" de una entrada del catálogo SAT; "—" sin ella. */
export const satCatalogLabel = (
  item: { codigo: string; descripcion: string } | undefined,
): string => (item ? `${item.codigo} - ${item.descripcion}` : "—");

/** "Ciudad, Estado" sin separador colgando cuando falta uno; "—" sin ninguno. */
export const formatCustomerUbicacion = (customer: Pick<Customer, "ciudad" | "estado">): string =>
  [customer.ciudad, customer.estado].map((value) => value?.trim()).filter(Boolean).join(", ") ||
  "—";
