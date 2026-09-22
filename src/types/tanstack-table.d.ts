import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

/**
 * Claves de `meta` que `DataTable` lee en cada `ColumnDef`. Tiparlas aquí (en
 * vez de castear `columnDef.meta` dentro de `DataTable`) hace que los 69
 * archivos `*Columns.tsx` tengan autocompletado y que una clave mal escrita
 * falle en `typecheck`. Todas son opcionales: una columna sin `meta` sigue
 * siendo válida.
 */
declare module "@tanstack/react-table" {
  // Los parámetros de tipo son los que declara la interfaz original: una
  // augmentation debe repetirlos aunque no los use.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Etiqueta legible de la columna para el selector "Mostrar/Ocultar" y las
     * exportaciones. Necesaria cuando `header` es un componente (no un
     * string); si se omite, `DataTable` deriva la etiqueta del `header`
     * string o del `accessorKey`.
     */
    label?: string;
    /**
     * Oculta la columna por debajo de `md` (`hidden md:table-cell`), para
     * columnas secundarias que no deben competir por espacio en pantallas
     * angostas.
     */
    hideOnMobile?: boolean;
    /**
     * Alineación horizontal de encabezado Y celda, aplicada por `DataTable` a
     * nivel de `<th>`/`<td>` (no hace falta ninguna clase en el contenido de
     * la columna). Si se omite: `"left"`. Importes y cantidades numéricas
     * van en `"right"` (los dígitos alinean); "Acciones", indicadores de
     * estatus y columnas centradas a propósito, en `"center"`.
     */
    align?: "left" | "center" | "right";
  }
}
