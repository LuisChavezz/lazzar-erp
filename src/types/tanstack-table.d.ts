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
    /**
     * SOLO modo servidor de `DataTable` (prop `server`); inerte en modo
     * cliente. Campo de `ordering` del backend por el que ordena esta columna
     * (sin signo: `"monto_estimado"`). La columna solo es ordenable si el campo
     * está en la lista blanca de la tabla (`server.sorting.fields`).
     */
    serverSort?: string;
    /**
     * SOLO modo servidor de `DataTable`; inerte en modo cliente. Clave del
     * filtro de servidor que controla el `ColumnHeaderFilter` de esta columna
     * (el nombre del parámetro del endpoint, p. ej. `"estado"`). Sin ella, un
     * `ColumnHeaderFilter` no se pinta en modo servidor.
     */
    serverFilter?: string;
  }
}
