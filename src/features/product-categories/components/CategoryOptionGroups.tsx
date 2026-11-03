import type { ReactNode } from "react";
import { groupCategoriesByLinea } from "../constants/categoriaLinea";

const OPTION_CLS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

interface CategoryOptionGroupsProps<T extends { id: number; linea: string }> {
  /** Categorías ya filtradas por quien llama (empresa, tallas…), en su orden. */
  categories: readonly T[];
  /** Texto de cada `<option>`. */
  renderLabel: (category: T) => ReactNode;
}

/**
 * Opciones de un `<select>` de categoría agrupadas por línea con `<optgroup>`
 * (ver `groupCategoriesByLinea`): un grupo por línea en el orden del catálogo
 * y "Sin línea (materia prima)" al final. Solo pinta los hijos del `<select>`
 * (va dentro de un `FormSelect`), así que el valor seleccionado y el
 * placeholder siguen en manos de quien lo usa.
 */
export function CategoryOptionGroups<T extends { id: number; linea: string }>({
  categories,
  renderLabel,
}: CategoryOptionGroupsProps<T>) {
  return groupCategoriesByLinea(categories).map((group) => (
    <optgroup key={group.key} label={group.label} className={OPTION_CLS}>
      {group.categories.map((category) => (
        <option key={category.id} value={category.id} className={OPTION_CLS}>
          {renderLabel(category)}
        </option>
      ))}
    </optgroup>
  ));
}
